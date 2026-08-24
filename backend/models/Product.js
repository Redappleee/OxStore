const mongoose=require('mongoose');
const productSchema=new mongoose.Schema({name:{type:String,required:true,trim:true,index:'text'},description:{type:String,required:true,index:'text'},price:{type:Number,required:true,min:0},compareAtPrice:{type:Number,min:0},category:{type:String,required:true,index:true},gender:{type:String,enum:['women','men','unisex'],default:'unisex'},sizes:[String],colors:[String],images:[{url:String,publicId:String}],stock:{type:Number,required:true,min:0,default:0},featured:{type:Boolean,default:false},rating:{type:Number,default:0},reviewCount:{type:Number,default:0}},{timestamps:true});
productSchema.index({name:'text',description:'text',category:'text'});
module.exports=mongoose.model('Product',productSchema);
