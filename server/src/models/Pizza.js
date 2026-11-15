import mongoose from 'mongoose';
const pizzaSchema = new mongoose.Schema({name:{type:String,required:true},description:String,image:String,price:{type:Number,required:true,min:0},active:{type:Boolean,default:true}},{timestamps:true});
export default mongoose.model('Pizza',pizzaSchema);
