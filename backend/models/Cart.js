const mongoose=require('mongoose');
module.exports=mongoose.model('Cart',new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',unique:true,required:true},items:[{product:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},quantity:{type:Number,min:1,default:1},size:String,color:String}]},{timestamps:true}));
