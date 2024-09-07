const User = require('../../../models/user.model');
module.exports.requireAuth = async (req, res, next) => {
    if(req.headers.authorization ){
        const token = req.headers.authorization.split(' ')[1];
        const user = await User.findOne({
            token: token,
            deleted: false
        }).select("-password");
        if(user){
            req.user= user;
            next();
        }else{
            res.status(400).json({ message: "Token invalid" });
            return;
        }
    }else{
        res.status(400).json({ message: "Token not found" });
        return;
    }
};