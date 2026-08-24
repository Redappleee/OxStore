const router=require('express').Router(),crypto=require('crypto'),passport=require('passport'),GoogleStrategy=require('passport-google-oauth20').Strategy,User=require('../models/User'),cloudinary=require('../config/cloudinary'),upload=require('../middleware/upload'),{accessToken,randomToken,hashToken,refreshExpiry}=require('../utils/tokens'),{sendMail}=require('../config/mailer'),{protect}=require('../middleware/auth');
const cookie=(res,token)=>res.cookie('refreshToken',token,{httpOnly:true,secure:process.env.COOKIE_SECURE==='true',sameSite:'lax',path:'/api/auth',maxAge:Number(process.env.REFRESH_TOKEN_DAYS||7)*864e5});
async function issue(res,user){const raw=randomToken();user.refreshTokens.push({tokenHash:hashToken(raw),expiresAt:refreshExpiry()});await user.save();cookie(res,raw);return accessToken(user)}
const url=(path,token)=>`${process.env.CLIENT_URL}${path}/${token}`;
router.post('/register',async(req,res)=>{const {name,email,password}=req.body;if(!name||!email||!password)return res.status(400).json({message:'Name, email and password are required'});if(await User.exists({email}))return res.status(409).json({message:'Email is already registered'});const raw=randomToken(),user=await User.create({name,email,password,verificationTokenHash:hashToken(raw),verificationTokenExpires:new Date(Date.now()+864e5)});sendMail({to:user.email,subject:'Verify your OxStore email',html:`<p>Welcome to OxStore. <a href="${url('/verify-email',raw)}">Verify your email</a>.</p>`}).catch(console.error);res.status(201).json({message:'Account created. Check your email to verify it.'})});
router.post('/resend-verification',async(req,res)=>{const user=await User.findOne({email:req.body.email});if(user&&!user.isVerified){const raw=randomToken();user.verificationTokenHash=hashToken(raw);user.verificationTokenExpires=new Date(Date.now()+864e5);await user.save();sendMail({to:user.email,subject:'Verify your OxStore email',html:`<p><a href="${url('/verify-email',raw)}">Verify your email</a>. This link expires in 24 hours.</p>`}).catch(console.error)}res.json({message:'If the account exists and is unverified, a new verification email has been sent.'})});
router.get('/verify-email/:token',async(req,res)=>{const user=await User.findOne({verificationTokenHash:hashToken(req.params.token),verificationTokenExpires:{$gt:new Date()}});if(!user)return res.status(400).json({message:'Verification link is invalid or expired'});user.isVerified=true;user.verificationTokenHash=undefined;user.verificationTokenExpires=undefined;await user.save();res.json({message:'Email verified. You can now sign in.'})});
router.post('/login',async(req,res)=>{const user=await User.findOne({email:req.body.email}).select('+password');if(!user||!(await user.checkPassword(req.body.password)))return res.status(401).json({message:'Incorrect email or password'});if(!user.isVerified)return res.status(403).json({message:'Please verify your email before signing in'});res.json({accessToken:await issue(res,user),user:{id:user.id,name:user.name,email:user.email,role:user.role,avatar:user.avatar||''}})});
router.post('/refresh',async(req,res)=>{const raw=req.cookies.refreshToken;if(!raw)return res.status(401).json({message:'Missing refresh token'});const hash=hashToken(raw),user=await User.findOne({'refreshTokens.tokenHash':hash});if(!user){const reused=await User.findOne({usedRefreshTokenHashes:hash});if(reused){reused.refreshTokens=[];reused.usedRefreshTokenHashes=[];await reused.save();}res.clearCookie('refreshToken',{path:'/api/auth'});return res.status(401).json({message:'Refresh token reuse detected; please sign in again'});}const found=user.refreshTokens.find(t=>t.tokenHash===hash);if(found.expiresAt<new Date()){user.refreshTokens=user.refreshTokens.filter(t=>t.tokenHash!==hash);await user.save();return res.status(401).json({message:'Refresh token expired'});}user.refreshTokens=user.refreshTokens.filter(t=>t.tokenHash!==hash);user.usedRefreshTokenHashes=[...(user.usedRefreshTokenHashes||[]),hash].slice(-20);res.json({accessToken:await issue(res,user),user:{id:user.id,name:user.name,email:user.email,role:user.role,avatar:user.avatar||''}})});
router.post('/logout',async(req,res)=>{if(req.cookies.refreshToken){await User.updateOne({'refreshTokens.tokenHash':hashToken(req.cookies.refreshToken)},{$pull:{refreshTokens:{tokenHash:hashToken(req.cookies.refreshToken)}}});}res.clearCookie('refreshToken',{path:'/api/auth'}).json({message:'Signed out'})});
router.post('/forgot-password',async(req,res)=>{const user=await User.findOne({email:req.body.email});if(user){const raw=randomToken();user.resetTokenHash=hashToken(raw);user.resetTokenExpires=new Date(Date.now()+3600000);await user.save();sendMail({to:user.email,subject:'Reset your OxStore password',html:`<p><a href="${url('/reset-password',raw)}">Reset your password</a>. This link expires in one hour.</p>`}).catch(console.error)}res.json({message:'If that email exists, a reset link has been sent.'})});
router.post('/reset-password/:token',async(req,res)=>{const user=await User.findOne({resetTokenHash:hashToken(req.params.token),resetTokenExpires:{$gt:new Date()}}).select('+password');if(!user)return res.status(400).json({message:'Reset link is invalid or expired'});if(!req.body.password||req.body.password.length<8)return res.status(400).json({message:'Password must be at least 8 characters'});user.password=req.body.password;user.resetTokenHash=undefined;user.resetTokenExpires=undefined;user.refreshTokens=[];await user.save();res.json({message:'Password reset. Please sign in.'})});
// Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID:process.env.GOOGLE_CLIENT_ID,
  clientSecret:process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:process.env.GOOGLE_CALLBACK_URL||'/api/auth/google/callback',
},async(accessTokenG,refreshTokenG,profile,done)=>{
  try{
    const email=profile.emails?.[0]?.value;
    if(!email)return done(new Error('No email from Google'));
    let user=await User.findOne({googleId:profile.id});
    if(!user)user=await User.findOne({email});
    if(user){
      if(!user.googleId){user.googleId=profile.id;}
      if(!user.avatar&&profile.photos?.[0]?.value)user.avatar=profile.photos[0].value;
      user.isVerified=true;
      await user.save();
    }else{
      user=await User.create({name:profile.displayName||email.split('@')[0],email,googleId:profile.id,avatar:profile.photos?.[0]?.value||'',isVerified:true});
    }
    done(null,user);
  }catch(e){done(e);}
}));
router.get('/google',passport.authenticate('google',{scope:['profile','email'],session:false}));
router.get('/google/callback',passport.authenticate('google',{session:false,failureRedirect:`${process.env.CLIENT_URL}/login?error=google`}),async(req,res)=>{
  const user=req.user;
  const raw=randomToken();
  user.refreshTokens.push({tokenHash:hashToken(raw),expiresAt:refreshExpiry()});
  await user.save();
  const at=accessToken(user);
  res.cookie('refreshToken',raw,{httpOnly:true,secure:process.env.COOKIE_SECURE==='true',sameSite:'lax',path:'/api/auth',maxAge:Number(process.env.REFRESH_TOKEN_DAYS||7)*864e5});
  res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${at}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&id=${user.id}&role=${user.role}&avatar=${encodeURIComponent(user.avatar||'')}`);
});
router.get('/me',protect,(req,res)=>res.json({user:{id:req.user.id,name:req.user.name,email:req.user.email,phone:req.user.phone||'',avatar:req.user.avatar||'',role:req.user.role,isVerified:req.user.isVerified,createdAt:req.user.createdAt,sessionCount:req.user.refreshTokens?.length||0}}));
router.patch('/me',protect,async(req,res)=>{const allowed={};if(req.body.name)allowed.name=req.body.name;if(req.body.phone!==undefined)allowed.phone=req.body.phone;const user=await User.findByIdAndUpdate(req.user.id,allowed,{new:true,runValidators:true});res.json({user:{id:user.id,name:user.name,email:user.email,phone:user.phone||'',avatar:user.avatar||'',role:user.role,createdAt:user.createdAt}})});
router.patch('/me/avatar',protect,upload.single('avatar'),async(req,res)=>{if(!req.file)return res.status(400).json({message:'No image uploaded'});const user=await User.findById(req.user.id);if(user.avatar&&user.avatar.includes('res.cloudinary.com')&&!user.avatar.includes('googleusercontent')){const pid=user.avatar.split('/').pop().split('.')[0];await cloudinary.uploader.destroy(pid).catch(()=>{});}user.avatar=req.file.path;await user.save();res.json({user:{id:user.id,avatar:user.avatar}});});
router.patch('/me/password',protect,async(req,res)=>{const {currentPassword,newPassword}=req.body;if(!currentPassword||!newPassword)return res.status(400).json({message:'Both current and new password are required'});if(newPassword.length<8)return res.status(400).json({message:'New password must be at least 8 characters'});const user=await User.findById(req.user.id).select('+password');if(!(await user.checkPassword(currentPassword)))return res.status(401).json({message:'Current password is incorrect'});user.password=newPassword;user.refreshTokens=[];await user.save();res.clearCookie('refreshToken',{path:'/api/auth'}).json({message:'Password changed. Please sign in again.'})});
router.delete('/me',protect,async(req,res)=>{const user=await User.findById(req.user.id).select('+password');if(!user)return res.status(404).json({message:'User not found'});if(req.body.password&&!(await user.checkPassword(req.body.password)))return res.status(401).json({message:'Incorrect password'});await User.findByIdAndDelete(req.user.id);res.clearCookie('refreshToken',{path:'/api/auth'}).json({message:'Account deleted'})});
router.delete('/me/sessions',protect,async(req,res)=>{await User.findByIdAndUpdate(req.user.id,{refreshTokens:[]});res.clearCookie('refreshToken',{path:'/api/auth'}).json({message:'All sessions signed out'});});
module.exports=router;
