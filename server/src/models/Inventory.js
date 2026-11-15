import mongoose from 'mongoose';
const inventorySchema = new mongoose.Schema({category:{type:String,enum:['base','sauce','cheese','vegetable'],required:true},name:{type:String,required:true},stock:{type:Number,required:true,min:0,default:0},threshold:{type:Number,default:20,min:0},alertSent:{type:Boolean,default:false}},{timestamps:true});
inventorySchema.index({category:1,name:1},{unique:true});
export default mongoose.model('Inventory',inventorySchema);
