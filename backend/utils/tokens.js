const jwt=require('jsonwebtoken'),crypto=require('crypto');
exports.accessToken=user=>jwt.sign({sub:user._id,role:user.role},process.env.JWT_ACCESS_SECRET,{expiresIn:process.env.JWT_ACCESS_EXPIRES||'15m'});
exports.randomToken=()=>crypto.randomBytes(48).toString('hex');
exports.hashToken=token=>crypto.createHash('sha256').update(token).digest('hex');
exports.refreshExpiry=()=>new Date(Date.now()+Number(process.env.REFRESH_TOKEN_DAYS||7)*864e5);
