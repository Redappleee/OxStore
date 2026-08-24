require('dotenv').config();require('express-async-errors');
const express=require('express'),cors=require('cors'),helmet=require('helmet'),rateLimit=require('express-rate-limit'),mongoSanitize=require('express-mongo-sanitize'),hpp=require('hpp'),cookieParser=require('cookie-parser'),connect=require('./config/db');
const app=express();app.set('trust proxy',1);app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));app.use(cors({origin:process.env.CLIENT_URL,credentials:true}));app.use('/api',rateLimit({windowMs:15*60*1000,max:300,standardHeaders:true,legacyHeaders:false}));
app.post('/api/payments/webhook',express.raw({type:'application/json'}),require('./routes/payments').webhook);
app.post('/api/payments/razorpay-webhook',express.raw({type:'application/json'}),require('./routes/payments').razorpayWebhook);
app.use(express.json({limit:'1mb'}));app.use(cookieParser());app.use(mongoSanitize());app.use(hpp());const passport=require('passport');app.use(passport.initialize());
app.get('/api/health',(req,res)=>res.json({ok:true}));app.use('/api/auth',require('./routes/auth'));app.use('/api/products',require('./routes/products'));app.use('/api/cart',require('./routes/cart'));app.use('/api/wishlist',require('./routes/wishlist'));app.use('/api/reviews',require('./routes/reviews'));app.use('/api/orders',require('./routes/orders'));app.use('/api/payments',require('./routes/payments').router);app.use('/api/admin',require('./routes/admin'));
app.use((req,res)=>res.status(404).json({message:'Route not found'}));
app.use((err,req,res,next)=>{console.error(err);res.status(err.status||500).json({message:err.message||'Internal server error'})});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  connect().catch(e => console.error('MongoDB connection error:', e));
});
