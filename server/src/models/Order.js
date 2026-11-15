import mongoose from 'mongoose';
const orderSchema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  items:[{name:String,quantity:{type:Number,default:1},unitPrice:Number,customization:{base:String,sauce:String,cheese:String,vegetables:[String]}}],
  amount:{type:Number,required:true},currency:{type:String,default:'INR'},
  paymentMethod:{type:String,enum:['razorpay','cod'],required:true},paymentStatus:{type:String,enum:['pending','paid','failed'],default:'pending'},
  razorpayOrderId:String,razorpayPaymentId:String,
  status:{type:String,enum:['ORDER_RECEIVED','IN_KITCHEN','SENT_TO_DELIVERY','DELIVERED','CANCELLED'],default:'ORDER_RECEIVED'},
  stockDeducted:{type:Boolean,default:false},deliveryAddress:{type:String,default:''}
},{timestamps:true});
export default mongoose.model('Order',orderSchema);
