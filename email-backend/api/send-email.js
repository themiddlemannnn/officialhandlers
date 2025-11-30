// Save this as: send-email.js

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
    
    try {
        const MAILJET_API_KEY = process.env.MAILJET_API_KEY;
        const MAILJET_API_SECRET = process.env.MAILJET_API_SECRET;
        
        if (!MAILJET_API_KEY || !MAILJET_API_SECRET) {
            return res.status(500).json({ 
                success: false, 
                message: 'Mailjet credentials not configured' 
            });
        }
        
        const { recipient, recipientName, subject, message, senderName, senderEmail } = req.body;
        
        if (!recipient || !subject || !message || !senderName || !senderEmail) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email format' 
            });
        }
        
        const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_API_SECRET}`).toString('base64');
        
        const mailjetPayload = {
            Messages: [{
                From: {
                    Email: senderEmail,
                    Name: senderName
                },
                To: [{
                    Email: recipient,
                    Name: recipientName || recipient.split('@')[0]
                }],
                Subject: subject,
                TextPart: message,
                HTMLPart: message.replace(/\n/g, '<br>')
            }]
        };
        
        const response = await fetch('https://api.mailjet.com/v3.1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(mailjetPayload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Mailjet error:', data);
            return res.status(response.status).json({ 
                success: false, 
                message: data.ErrorMessage || 'Failed to send email'
            });
        }
        
        return res.status(200).json({ 
            success: true, 
            message: 'Email sent successfully',
            messageId: data.Messages[0].To[0].MessageID
        });
        
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message 
        });
    }
}