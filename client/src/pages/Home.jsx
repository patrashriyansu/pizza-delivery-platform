import {useEffect,useMemo,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {ArrowRight,ChefHat,Flame,Leaf,Plus,Minus,ShoppingBag,Trash2} from 'lucide-react';
import api from '../api';
import {useAuth} from '../context/AuthContext';

const defaults=[
  {_id:'1',name:'Margherita',description:'Classic tomato, mozzarella and basil',price:249},
  {_id:'2',name:'Farmhouse',description:'Onion, capsicum, tomato and cheese',price:329},
  {_id:'3',name:'Paneer Tikka',description:'Spiced paneer with a smoky finish',price:379},
  {_id:'4',name:'Veggie Supreme',description:'A garden of fresh, colorful toppings',price:399}
];
const defaultCustomization={base:'Classic Thin Crust',sauce:'Classic Tomato',cheese:'Mozzarella',vegetables:['Onion']};

function readSavedCart(){
  try {
    const saved=JSON.parse(localStorage.getItem('slice_cart')||'[]');
    return Array.isArray(saved)?saved.filter(x=>x&&x.id&&Number(x.quantity)>0):[];
  } catch { return []; }
}

export default function Home(){
  const [pizzas,setPizzas]=useState(defaults);
  const [options,setOptions]=useState([]);
  const [cart,setCart]=useState(readSavedCart);
  const [custom,setCustom]=useState({base:'Classic Thin Crust',sauce:'Classic Tomato',cheese:'Mozzarella',vegetables:['Onion','Capsicum']});
  const {user}=useAuth();
  const navigate=useNavigate();
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [delivery,setDelivery]=useState({phone:'',address:'',instructions:''});
  const [paymentMethod,setPaymentMethod]=useState('cod');
  const razorpayAvailable=Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID);

  useEffect(()=>{
    localStorage.setItem('slice_cart',JSON.stringify(cart));
  },[cart]);

  useEffect(()=>{
    api.get('/pizzas').then(({data})=>{
      if(data.pizzas?.length)setPizzas(data.pizzas);
      setOptions(data.options||[]);
    }).catch(()=>{});
  },[]);

  const groups=useMemo(()=>({
    base:options.filter(x=>x.category==='base'),
    sauce:options.filter(x=>x.category==='sauce'),
    cheese:options.filter(x=>x.category==='cheese'),
    vegetable:options.filter(x=>x.category==='vegetable')
  }),[options]);

  const itemCount=cart.reduce((sum,item)=>sum+item.quantity,0);
  const subtotal=cart.reduce((sum,item)=>sum+(item.price*item.quantity),0);

  function addPizza(p){
    setCart(current=>{
      const existing=current.find(x=>x.pizzaId===p._id&&!x.customization);
      if(existing){
        return current.map(x=>x.id===existing.id?{...x,quantity:x.quantity+1}:x);
      }
      return [...current,{id:crypto.randomUUID(),pizzaId:p._id,name:p.name,quantity:1,price:p.price,customization:null}];
    });
    setNotice(p.name+' added to your bag.');
  }

  function toggleVeg(v){
    setCustom(c=>({...c,vegetables:c.vegetables.includes(v)?c.vegetables.filter(x=>x!==v):[...c.vegetables,v]}));
  }

  function addCustom(){
    const customization={...custom,vegetables:[...custom.vegetables]};
    setCart(current=>{
      const existing=current.find(x=>!x.pizzaId&&JSON.stringify(x.customization)===JSON.stringify(customization));
      if(existing)return current.map(x=>x.id===existing.id?{...x,quantity:x.quantity+1}:x);
      return [...current,{id:crypto.randomUUID(),name:'Custom Pizza',quantity:1,price:170+custom.vegetables.length*15,customization}];
    });
    setNotice('Your custom pizza was added to your bag.');
  }

  function changeQuantity(id,delta){
    setCart(current=>current.map(x=>x.id===id?{...x,quantity:x.quantity+delta}:x).filter(x=>x.quantity>0));
    setNotice('');
  }

  function removeItem(id){
    setCart(current=>current.filter(x=>x.id!==id));
    setNotice('Item removed from your bag.');
  }

  function clearCart(){
    setCart([]);
    setNotice('Your bag is now empty.');
  }

  async function checkout(){
    if(!cart.length)return;
    if(!user){
      setNotice('Your bag is saved. Sign in or create an account to continue.');
      navigate('/login');
      return;
    }
    const phone=delivery.phone.replace(/\D/g,'');
    if(!/^[6-9]\d{9}$/.test(phone)){setNotice('Enter a valid 10-digit Indian mobile number.');return;}
    if(delivery.address.trim().length<10){setNotice('Enter a complete delivery address (at least 10 characters).');return;}
    if(paymentMethod==='razorpay'&&!razorpayAvailable){setNotice('Online payment is not configured yet. Choose Cash on Delivery for now.');return;}
    const customerDetails={phone,address:delivery.address.trim(),instructions:delivery.instructions.trim()};
    setBusy(true);
    setNotice('');
    try{
      const items=cart.map(x=>({
        pizzaId:x.pizzaId,
        quantity:x.quantity,
        customization:x.customization||defaultCustomization
      }));
      if(paymentMethod==='razorpay'){
        const {data}=await api.post('/orders/payment-order',{items,customerDetails});
        let script=document.querySelector('script[data-razorpay]');
        if(!script){
          script=document.createElement('script');
          script.src='https://checkout.razorpay.com/v1/checkout.js';
          script.dataset.razorpay='true';
          await new Promise((resolve,reject)=>{
            script.onload=resolve;
            script.onerror=()=>reject(new Error('Could not load the payment window'));
            document.body.appendChild(script);
          });
        }
        const rzp=new window.Razorpay({
          key:data.keyId||import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount:data.amount,
          currency:data.currency,
          name:'SliceHouse',
          description:'Pizza order',
          order_id:data.razorpayOrderId,
          handler:async response=>{
            try{
              await api.post('/orders/verify-payment',{
                items,
                customerDetails,
                razorpay_order_id:response.razorpay_order_id,
                razorpay_payment_id:response.razorpay_payment_id,
                razorpay_signature:response.razorpay_signature
              });
              setCart([]);
              setNotice('Payment successful! Your order is confirmed.');
            }catch(error){
              setNotice(error.response?.data?.message||'Payment was received but order confirmation failed. Contact support before retrying.');
            }
          },
          theme:{color:'#ef542b'}
        });
        rzp.open();
      }else{
        const {data}=await api.post('/orders/cod',{items,customerDetails});
        setCart([]);
        setNotice('Order #'+data.order._id.slice(-6).toUpperCase()+' placed with Cash on Delivery.');
      }
    }catch(error){
      setNotice(error.response?.data?.message||error.message||'Checkout could not be completed. Please try again.');
    }finally{
      setBusy(false);
    }
  }

  return <>
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><Flame size={15}/> HOT, FRESH & MADE FOR YOU</div>
        <h1>Good days start<br/>with <em>great pizza.</em></h1>
        <p>Hand-stretched dough, bold sauces and the toppings you love. Make it yours, one delicious layer at a time.</p>
        <a className="primary" href="#menu">Explore the menu <ArrowRight size={17}/></a>
        <div className="hero-stats">
          <span><b>30 min</b><small>Average delivery</small></span>
          <span><b>100%</b><small>Fresh ingredients</small></span>
          <span><b>Your way</b><small>Custom-built pizzas</small></span>
        </div>
      </div>
      <div className="hero-art">
        <div className="sun-disc"></div><div className="pizza-emoji">🍕</div>
        <div className="floating-note note-one">✦ Made fresh</div>
        <div className="floating-note note-two">Extra cheesy!</div>
      </div>
    </section>

    <section className="menu-section" id="menu">
      <div className="section-heading">
        <div><div className="eyebrow">THE CROWD FAVORITES</div><h2>Meet your new <em>favorite.</em></h2></div>
        <p>Big flavor. No compromises.</p>
      </div>
      <div className="pizza-grid">
        {pizzas.map((p,i)=><article className="pizza-card" key={p._id}>
          <div className={'pizza-visual pizza-'+(i%4)}><span>🍕</span><b>{['BESTSELLER','HOUSE PICK','CHEF SPECIAL','FAN FAVORITE'][i%4]}</b></div>
          <div className="pizza-info">
            <h3>{p.name}</h3><p>{p.description}</p>
            <div><strong>₹{p.price}</strong><button aria-label={'Add '+p.name} title={'Add '+p.name+' to bag'} className="add-btn" onClick={()=>addPizza(p)}><Plus size={17}/><span>Add</span></button></div>
          </div>
        </article>)}
      </div>
    </section>

    <section className="builder-section">
      <div className="builder-intro">
        <div className="eyebrow"><ChefHat size={15}/> THE PIZZA LAB</div>
        <h2>Your pizza.<br/><em>Your rules.</em></h2>
        <p>Pick your base, choose your sauce, make it cheesy and finish with your favorite veggies.</p>
        <div className="feature-line"><Leaf size={18}/> Freshly prepared, just for you</div>
      </div>
      <div className="builder-card">
        <div className="builder-title"><span>01 — BUILD YOUR PIE</span><b>Custom pizza</b></div>
        { [['base','Choose a base'],['sauce','Pick a sauce'],['cheese','Make it cheesy']].map(([key,label])=>
          <label className="choice-group" key={key}>{label}
            <select value={custom[key]} onChange={e=>setCustom({...custom,[key]:e.target.value})}>
              {(groups[key]?.length?groups[key].map(x=>x.name):key==='base'?['Classic Thin Crust','Classic Pan','Cheese Burst']:key==='sauce'?['Classic Tomato','Peri Peri','Pesto']:['Mozzarella','Cheddar']).map(x=><option key={x}>{x}</option>)}
            </select>
          </label>
        )}
        <div className="choice-group">Add your veggies
          <div className="veggie-list">
            {(groups.vegetable.length?groups.vegetable.map(x=>x.name):['Onion','Capsicum','Tomato','Olive','Sweet Corn']).map(v=>
              <button type="button" key={v} className={custom.vegetables.includes(v)?'veggie selected':'veggie'} onClick={()=>toggleVeg(v)}>{custom.vegetables.includes(v)?'✓ ':'＋ '}{v}</button>
            )}
          </div>
        </div>
        <div className="builder-bottom">
          <div><small>Starting at</small><strong>₹{170+custom.vegetables.length*15}</strong></div>
          <button className="primary" onClick={addCustom}>Add to bag <Plus size={17}/></button>
        </div>
      </div>
    </section>

    <section className="cart-section" id="cart">
      <div className="cart-heading">
        <div><div className="eyebrow">READY WHEN YOU ARE</div><h2>Your <em>bag.</em></h2></div>
        {cart.length>0&&<button className="clear-cart" onClick={clearCart}><Trash2 size={15}/> Clear bag</button>}
      </div>
      {cart.length===0?<div className="empty-cart"><ShoppingBag size={27}/><p>Your bag is empty.</p><small>Tap <b>Add</b> on a pizza or build your own below.</small></div>:
        <div className="cart-list">
          {cart.map(item=><article className="cart-line" key={item.id}>
            <div className="cart-line-info"><b>{item.name}</b><small>{item.customization?item.customization.base+' · '+item.customization.sauce+' · '+item.customization.cheese:'Classic recipe'}</small><strong>₹{item.price*item.quantity}</strong></div>
            <div className="cart-line-actions">
              <div className="quantity-control">
                <button aria-label={'Decrease '+item.name} onClick={()=>changeQuantity(item.id,-1)}><Minus size={14}/></button>
                <span>{item.quantity}</span>
                <button aria-label={'Increase '+item.name} onClick={()=>changeQuantity(item.id,1)}><Plus size={14}/></button>
              </div>
              <button className="remove-item" aria-label={'Remove '+item.name} onClick={()=>removeItem(item.id)}><Trash2 size={14}/> Remove</button>
            </div>
          </article>)}
        </div>
      }
      {cart.length>0&&<section className="checkout-details" aria-labelledby="checkout-details-title">
        <div className="checkout-section-title"><span>02 — CHECKOUT</span><h3 id="checkout-details-title">Delivery & contact details</h3><p>We’ll use this information to deliver your order and contact you if needed.</p></div>
        <div className="checkout-profile"><div><small>Ordering as</small><b>{user?.name||'Sign in required'}</b></div><div><small>Account email</small><b>{user?.email||'—'}</b></div></div>
        <div className="checkout-fields">
          <label>Mobile number <span>Required</span><input type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} placeholder="10-digit mobile number" value={delivery.phone} onChange={e=>setDelivery({...delivery,phone:e.target.value.replace(/\D/g,'').slice(0,10)})}/></label>
          <label className="address-field">Delivery address <span>Required</span><textarea autoComplete="street-address" rows={3} maxLength={250} placeholder="House / flat, street, area, landmark, city, PIN code" value={delivery.address} onChange={e=>setDelivery({...delivery,address:e.target.value})}/></label>
          <label className="address-field">Delivery instructions <small>Optional</small><textarea rows={2} maxLength={300} placeholder="Landmark, gate instructions or other delivery notes" value={delivery.instructions} onChange={e=>setDelivery({...delivery,instructions:e.target.value})}/></label>
        </div>
        <div className="payment-block"><div className="checkout-section-title"><span>03 — PAYMENT</span><h3>Choose how to pay</h3></div>
          <div className="payment-options">
            <label className={"payment-option "+(paymentMethod==='cod'?'selected':'')}><input type="radio" name="paymentMethod" value="cod" checked={paymentMethod==='cod'} onChange={()=>setPaymentMethod('cod')}/><span><b>Cash on Delivery</b><small>Pay when your pizza arrives</small></span><strong>Available</strong></label>
            <label className={"payment-option "+(paymentMethod==='razorpay'?'selected':'')+(!razorpayAvailable?' unavailable':'')}><input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod==='razorpay'} disabled={!razorpayAvailable} onChange={()=>setPaymentMethod('razorpay')}/><span><b>Pay Online</b><small>UPI · Cards · Netbanking · Wallets</small></span><strong>{razorpayAvailable?'Secure checkout':'Not configured'}</strong></label>
          </div>
          {!razorpayAvailable&&<p className="payment-help">Online payments will be available after the store’s Razorpay test keys are configured. Cash on Delivery is ready to use.</p>}
        </div>
      </section>}
      <div className="cart-footer">
        <div><small>{itemCount} item(s)</small><b>Subtotal <strong>₹{subtotal}</strong></b><small className="checkout-note">{user?'Review your delivery and payment details above.':'Sign in is required before checkout. Your bag will be saved.'}</small></div>
        <button className="primary checkout-button" onClick={checkout} disabled={!cart.length||busy}>{busy?'Processing…':user?'Place order':'Sign in to checkout'} <ArrowRight size={17}/></button>
      </div>
      {notice&&<p className="cart-notice" role="status">{notice}</p>}
    </section>

    <footer className="footer">
      <Link className="brand" to="/"><span className="brand-icon"><span>✦</span></span>slice<span>house</span></Link>
      <span>Good pizza. Good mood. © 2026 SliceHouse. · Contact and delivery details are collected at checkout.</span>
    </footer>
  </>;
}
