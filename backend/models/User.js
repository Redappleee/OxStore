const mongoose = require('mongoose'), bcrypt = require('bcryptjs');
const tokenSchema = new mongoose.Schema({tokenHash:{type:String,required:true},expiresAt:{type:Date,required:true},createdAt:{type:Date,default:Date.now}},{_id:false});
const userSchema = new mongoose.Schema({name:{type:String,required:true,trim:true,maxlength:80},email:{type:String,required:true,unique:true,lowercase:true,trim:true},password:{type:String,minlength:8,select:false},phone:{type:String,trim:true,default:''},avatar:{type:String,default:''},googleId:{type:String,sparse:true,unique:true},role:{type:String,enum:['user','admin'],default:'user'},isVerified:{type:Boolean,default:false},refreshTokens:[tokenSchema],usedRefreshTokenHashes:[String],verificationTokenHash:String,verificationTokenExpires:Date,resetTokenHash:String,resetTokenExpires:Date},{timestamps:true});
userSchema.pre('save',async function(){if(this.isModified('password')) this.password=await bcrypt.hash(this.password,12)});
userSchema.methods.checkPassword=function(password){return bcrypt.compare(password,this.password)};
module.exports=mongoose.model('User',userSchema);
