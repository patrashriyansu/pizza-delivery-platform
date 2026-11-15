import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {connectDB} from '../src/config/db.js';
import User from '../src/models/User.js';
import Pizza from '../src/models/Pizza.js';
import Inventory from '../src/models/Inventory.js';
await connectDB(process.env.MONGO_URI);
const email=(process.env.ADMIN_EMAIL||'admin@example.com').toLowerCase(); const password=process.env.ADMIN_PASSWORD||'ChangeThisAdminPassword123!';
let admin=await User.findOne({email}).select('+passwordHash'); if(!admin) admin=await User.create({name:process.env.ADMIN_NAME||'SliceHouse Admin',email,passwordHash:await bcrypt.hash(password,12),role:'admin',isVerified:true}); else {admin.role='admin';admin.isVerified=true;admin.passwordHash=await bcrypt.hash(password,12);await admin.save();}
const pizzas=[['Margherita','Classic tomato, mozzarella and basil',249],['Farmhouse','Onion, capsicum, tomato and cheese',329],['Paneer Tikka','Spiced paneer, onion and capsicum',379],['Veggie Supreme','A colorful mix of garden vegetables',399]];
for(const [name,description,price] of pizzas) await Pizza.updateOne({name},{$setOnInsert:{name,description,price,image:'',active:true}},{upsert:true});
const stock=[['base','Classic Thin Crust'],['base','Classic Pan'],['base','Cheese Burst'],['sauce','Classic Tomato'],['sauce','Peri Peri'],['sauce','Pesto'],['cheese','Mozzarella'],['cheese','Cheddar'],['vegetable','Onion'],['vegetable','Capsicum'],['vegetable','Tomato'],['vegetable','Olive'],['vegetable','Sweet Corn'],['vegetable','Mushroom']];
for(const [category,name] of stock) await Inventory.updateOne({category,name},{$setOnInsert:{category,name,stock:100,threshold:20}},{upsert:true});
console.log(`Seeded admin ${email}, catalog and inventory. Update credentials after first login.`); await mongoose.disconnect();
