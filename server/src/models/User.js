import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,maxLength:80},
  email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  passwordHash:{type:String,required:true,select:false},
  role:{type:String,enum:['customer','admin'],default:'customer'},
  isVerified:{type:Boolean,default:false},
  verifyTokenHash:String, verifyTokenExpires:Date,
  resetTokenHash:String, resetTokenExpires:Date
},{timestamps:true});
export default mongoose.model('User',userSchema);
