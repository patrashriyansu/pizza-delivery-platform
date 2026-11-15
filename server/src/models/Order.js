import mongoose from 'mongoose';
const orderSchema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  customerName:{type:String,required:true,trim:true},customerEmail:{type:String,required:true,lowercase:true,trim:true},
  phone:{type:String,required:true,match:/^[6-9]\\d{9}$/},deliveryInstructions:{type:String,default:'',maxLength:300},
  items:[{name:String,quantity:{type:Number,default:1},unitPrice:Number,customization:{base:String,sauce:String,cheese:String,vegetables:[String]}}],
  amount:{type:Number,required:true},currency:{type:String,default:'INR'},
  paymentMethod:{type:String,enum:['razorpay','cod'],required:true},paymentStatus:{type:String,enum:['pending','paid','failed'],default:'pending'},
  razorpayOrderId:String,razorpayPaymentId:String,
  status:{type:String,enum:['ORDER_RECEIVED','IN_KITCHEN','SENT_TO_DELIVERY','DELIVERED','CANCELLED'],default:'ORDER_RECEIVED'},
  stockDeducted:{type:Boolean,default:false},deliveryAddress:{type:String,required:true,trim:true,maxLength:250}
},{timestamps:true});
export default mongoose.model('Order',orderSchema);
