const router=require('express').Router(),Review=require('../models/Review'),Order=require('../models/Order'),Product=require('../models/Product'),{protect}=require('../middleware/auth');
const mongoose=require('mongoose');
async function recalc(product){const pId=typeof product==='string'?new mongoose.Types.ObjectId(product):product;const data=await Review.aggregate([{$match:{product:pId}},{$group:{_id:null,rating:{$avg:'$rating'},count:{$sum:1}}}]);await Product.findByIdAndUpdate(product,{rating:data[0]?.rating||0,reviewCount:data[0]?.count||0});}
router.get('/product/:productId',async(req,res)=>res.json({reviews:await Review.find({product:req.params.productId}).populate('user','name').sort('-createdAt')}));

router.get('/eligibility/:productId',protect,async(req,res)=>{
  const delivered=await Order.exists({user:req.user.id,status:'delivered','items.product':req.params.productId});
  const reviewed=await Review.exists({user:req.user.id,product:req.params.productId});
  res.json({
    canReview:Boolean(delivered&&!reviewed),
    hasDelivered:Boolean(delivered),
    hasReviewed:Boolean(reviewed),
    reason:!delivered?'Order not delivered yet':reviewed?'Already reviewed':'Eligible'
  });
});

router.post('/product/:productId',protect,async(req,res)=>{
  const delivered=await Order.exists({user:req.user.id,status:'delivered','items.product':req.params.productId});
  if(!delivered)return res.status(403).json({message:'Only customers with a delivered order for this item can leave a review.'});
  try{
    const review=await Review.create({product:req.params.productId,user:req.user.id,rating:req.body.rating,comment:req.body.comment});
    await recalc(review.product);
    res.status(201).json({review});
  }catch(e){
    if(e.code===11000)return res.status(409).json({message:'You have already reviewed this product'});
    throw e;
  }
});
module.exports=router;
