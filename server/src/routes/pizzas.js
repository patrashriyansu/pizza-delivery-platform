import {Router} from 'express';
import Pizza from '../models/Pizza.js';
import Inventory from '../models/Inventory.js';
import {asyncHandler} from '../utils/asyncHandler.js';
const router=Router();
router.get('/',asyncHandler(async(req,res)=>{const [pizzas,inventory]=await Promise.all([Pizza.find({active:true}).lean(),Inventory.find({stock:{$gt:0}}).select('category name').lean()]); res.json({pizzas,options:inventory});}));
export default router;
