import cron from 'node-cron';
import Inventory from '../models/Inventory.js';
import {sendEmail} from '../utils/email.js';
export function startLowStockJob(){cron.schedule('*/15 * * * *',async()=>{try{const rows=await Inventory.find({$expr:{$lte:['$stock','$threshold']},alertSent:false}); for(const row of rows){await sendEmail({to:process.env.ADMIN_ALERT_EMAIL||process.env.ADMIN_EMAIL,subject:`Low stock alert: ${row.name}`,html:`<p>${row.category}: ${row.name} has ${row.stock} unit(s) remaining (threshold ${row.threshold}).</p>`}); row.alertSent=true; await row.save();}}catch(err){console.error('Low-stock job failed:',err.message);}});}
