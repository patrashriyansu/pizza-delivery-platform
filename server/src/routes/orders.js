import {Router} from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import {protect} from '../middleware/auth.js';
import Order from '../models/Order.js';
import Pizza from '../models/Pizza.js';
import Inventory from '../models/Inventory.js';
import {asyncHandler} from '../utils/asyncHandler.js';
const router=Router(); router.use(protect);
function validateCustomization(c){if(!c?.base||!c?.sauce||!c?.cheese||!Array.isArray(c.vegetables)) throw new Error('Choose a base, sauce, cheese and vegetables');}
const defaultCustomization={base:'Classic Thin Crust',sauce:'Classic Tomato',cheese:'Mozzarella',vegetables:['Onion']};
function validateDeliveryDetails(details){
  const phone=String(details?.phone||'').replace(/\D/g,'');
  const address=String(details?.address||'').trim();
  const instructions=String(details?.instructions||'').trim();
  if(!/^[6-9]\d{9}$/.test(phone)) {const error=new Error('Enter a valid 10-digit Indian mobile number');error.status=400;throw error;}
  if(address.length<10||address.length>250) {const error=new Error('Enter a complete delivery address (10 to 250 characters)');error.status=400;throw error;}
  if(instructions.length>300) {const error=new Error('Delivery instructions must be 300 characters or fewer');error.status=400;throw error;}
  return {phone,address,instructions};
}
async function normalizeItems(items){
  if(!Array.isArray(items)||items.length===0||items.length>20) throw new Error('Your cart is empty or too large');
  const normalized=[];
  for(const item of items){
    const quantity=Math.max(1,Math.min(10,Math.trunc(Number(item.quantity)||1)));
    let name='Custom Pizza',unitPrice=170+((item.customization?.vegetables||[]).length*15);
    const customization=item.customization||defaultCustomization;
    validateCustomization(customization);
    if(item.pizzaId){
      const pizza=await Pizza.findOne({_id:item.pizzaId,active:true}).lean();
      if(!pizza) throw new Error('One of the selected pizzas is no longer available');
      name=pizza.name; unitPrice=pizza.price;
    }
    normalized.push({name,quantity,unitPrice,customization:{base:customization.base,sauce:customization.sauce,cheese:customization.cheese,vegetables:[...new Set(customization.vegetables)]}});
  }
  return {items:normalized,amount:normalized.reduce((sum,item)=>sum+item.unitPrice*item.quantity,0)};
}
async function persistPaidOrder(user,items,amount,method,payment,io,customerDetails){
  const session=await mongoose.startSession(); let order;
  try{await session.withTransaction(async()=>{
    for(const item of items){const c=item.customization; const needs=[['base',c.base],['sauce',c.sauce],['cheese',c.cheese],...c.vegetables.map(v=>['vegetable',v])];
      for(const [category,name] of needs){const doc=await Inventory.findOneAndUpdate({category,name,stock:{$gte:item.quantity}},{$inc:{stock:-item.quantity}},{new:true,session}); if(!doc) throw new Error(`Out of stock: ${name}`);}
    }
    [order]=await Order.create([{user:user._id,customerName:user.name,customerEmail:user.email,phone:customerDetails.phone,deliveryAddress:customerDetails.address,deliveryInstructions:customerDetails.instructions,items,amount,currency:'INR',paymentMethod:method,paymentStatus:method==='razorpay'?'paid':'pending',razorpayOrderId:payment?.orderId,razorpayPaymentId:payment?.paymentId,stockDeducted:true}],{session});
  });}finally{await session.endSession();}
  io.to(`user:${user._id}`).emit('order:update',{orderId:order._id,status:order.status}); return order;
}
router.post('/payment-order',asyncHandler(async(req,res)=>{
  if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET) return res.status(503).json({message:'Razorpay test keys are not configured'});
  const customerDetails=validateDeliveryDetails(req.body.customerDetails);
  const {items,amount}=await normalizeItems(req.body.items);
  const razorpay=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
  const rp=await razorpay.orders.create({amount:amount*100,currency:'INR',receipt:`slice_${Date.now()}`});
  res.json({keyId:process.env.RAZORPAY_KEY_ID,razorpayOrderId:rp.id,amount:rp.amount,currency:rp.currency,appAmount:amount});
}));
router.post('/verify-payment',asyncHandler(async(req,res)=>{
  const {items,razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body;
  if(!process.env.RAZORPAY_KEY_SECRET||!razorpay_order_id||!razorpay_payment_id||!razorpay_signature) return res.status(400).json({message:'Payment details are incomplete'});
  const expected=crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  const actual=String(razorpay_signature);
  if(expected.length!==actual.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(actual))) return res.status(400).json({message:'Payment signature verification failed'});
  const {items:normalized,amount}=await normalizeItems(items);
  const customerDetails=validateDeliveryDetails(req.body.customerDetails);
  const razorpay=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
  const paymentOrder=await razorpay.orders.fetch(razorpay_order_id);
  if(paymentOrder.amount!==amount*100||paymentOrder.currency!=='INR') return res.status(400).json({message:'Paid amount does not match the order'});
  const order=await persistPaidOrder(req.user,normalized,amount,'razorpay',{orderId:razorpay_order_id,paymentId:razorpay_payment_id},req.app.get('io'),customerDetails);
  res.status(201).json({message:'Payment verified and order placed',order});
}));
router.post('/cod',asyncHandler(async(req,res)=>{
  const customerDetails=validateDeliveryDetails(req.body.customerDetails);
  const {items,amount}=await normalizeItems(req.body.items);
  const order=await persistPaidOrder(req.user,items,amount,'cod',null,req.app.get('io'),customerDetails);
  res.status(201).json({message:'COD order placed',order});
}));
router.get('/mine',asyncHandler(async(req,res)=>{const orders=await Order.find({user:req.user._id}).sort({createdAt:-1}); res.json(orders);}));
export default router;
