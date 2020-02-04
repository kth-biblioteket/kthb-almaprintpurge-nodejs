require('dotenv').config();
const winston = require('winston');
const findRemoveSync = require('find-remove')
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');

const timezoned = () => {
    var options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        timeZone: 'Europe/Stockholm'
    };
    return new Date().toLocaleString('sv-SE', options);
};
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: timezoned
          }),
        winston.format.json()
    ),
    defaultMeta: { service: 'almaprintpurge' },
    transports: [
      new winston.transports.File({ filename: 'combined.log' })
    ]
});
const transporter = nodemailer.createTransport({
    port: 25,
    host: process.env.SMTP_HOST,
    tls: {
      rejectUnauthorized: false
    }
    //requireTLS: true
    //secure: true
});

let mailOptions = {
    from: {
     name: process.env.MAILFROM_NAME,
     address: process.env.MAILFROM_ADDRESS
    },
    to: process.env.MAILTO_ADDRESS,
    subject: process.env.MAILFROM_SUBJECT,
    html: '',
    generateTextFromHTML: true
};

function sendemail(html) {
    mailOptions.html=html;
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            logger.log('error', error);
        } 
        else {
            logger.log('info', 'Email sent: ' + info.response);
        }
    });
}

logger.log('info',"Alma Print service started");
sendemail('<p>Alma Print service started</p>');

let rule = new schedule.RecurrenceRule();
rule.hour = process.env.RULE_HOUR;
rule.minute = process.env.RULE_MINUTE;
rule.second = process.env.RULE_SECOND;

let j = schedule.scheduleJob(rule, function(){
    try {
        let result = findRemoveSync(process.env.APPDIR + process.env.PRINTHISTORYDIR, 
                                    {age: {seconds: process.env.DELETE_FILES_OLDER_THAN}, files: '*.*', limit: 1000})
        sendemail('<pre>' + JSON.stringify(result) + '<pre>');
        logger.log('info', result)
    }
    catch(error) {
        logger.log('error', error)
    }
});

