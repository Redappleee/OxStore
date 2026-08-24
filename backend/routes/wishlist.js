const router=require('express').Router(),Wishlist=require('../models/Wishlist'),{protect}=require('../middleware/auth');
const get=user=>Wishlist.findOne({user}).populate('products');
router.get('/',protect,async(req,res)=>res.json({wishlist:await get(req.user.id)||await Wishlist.create({user:req.user.id})}));
router.post('/:productId',protect,async(req,res)=>{let wishlist=await Wishlist.findOne({user:req.user.id})||await Wishlist.create({user:req.user.id});if(!wishlist.products.some(p=>p.equals(req.params.productId)))wishlist.products.push(req.params.productId);await wishlist.save();res.json({wishlist:await get(req.user.id)})});
router.delete('/:productId',protect,async(req,res)=>{await Wishlist.updateOne({user:req.user.id},{$pull:{products:req.params.productId}});res.json({wishlist:await get(req.user.id)})});module.exports=router;
