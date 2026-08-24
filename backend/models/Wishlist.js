const mongoose=require('mongoose');
module.exports=mongoose.model('Wishlist',new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',unique:true,required:true},products:[{type:mongoose.Schema.Types.ObjectId,ref:'Product'}]},{timestamps:true}));
