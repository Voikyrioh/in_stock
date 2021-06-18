import {authRetarded, createRetarded, getRetardedByUsername} from "../Services/RetardedService";
import {
    authenticate,
    checkPasswordSecurity,
    checkRequiredBodyFields,
    generateAccessToken, hashPassword
} from "../Services/SecurityService";

const router = require('express').Router();

router.get('/user/:id', authenticate, (req, res) => {

})

router.post('/user/update', authenticate, (req, res) => {
    
})

router.post('/user/role/update', authenticate, (req, res) => {
    if(!checkRequiredBodyFields(req, res, ["id", "role"])) {
        return;
    }

    if(!checkRequiredBodyFields(req, res, ["id", "role"])) {
        return;
    }
})

router.get('/logout', authenticate, (req, res) => {
    res.cookie('jwt', 'deleted', {expires: new Date()});
    res.send({expiresIn: -1, user: { username: null, role: ''}});
})

router.put('/signup', async (req, res) => {
    if(!checkRequiredBodyFields(req, res, ["username", "password", "email"])) {
        return;
    }
    
    if (await getRetardedByUsername(req.body.username)) {
        res.status(400);
        res.send('username already exist')
        return;
    }
    
    const passwordCheck = checkPasswordSecurity(req.body.password);
    if (passwordCheck) {
        res.status(400);
        res.send(passwordCheck);
    }

    try {
        const hashedPassword = await hashPassword(req.body.password);

        const newRetarded = {
            id: 0,
            username: req.body.username,
            password: hashedPassword.hash,
            salt: hashedPassword.salt,
            role: 'RETARDED',
            email: req.body.email,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
        }
        
        createRetarded(newRetarded).then(id => {
            if (!id[0]) {
                res.sendStatus(500);
                return;
            }
            newRetarded.id = id[0];
            
            const expireDate = new Date();
            expireDate.setSeconds(3600);
        
            res.cookie('jwt', generateAccessToken(newRetarded.id, newRetarded.role), {expires: expireDate});
            res.send({expiresIn: 3600, role: newRetarded.role});
                
        }).catch(error => {
            console.error(error);
            res.sendStatus(500);
        });
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
})

router.post('/login', (req, res) => {
    if(!checkRequiredBodyFields(req, res, ["username", "password"])) {
        return;
    }
    
    authRetarded(req?.body?.username, req?.body?.password).then(auth => {
        if (!auth) {
            res.sendStatus(404);
            return;
        }

        const expireDate = new Date();
        expireDate.setSeconds(3600);
        
        res.cookie('jwt', generateAccessToken(auth.id, auth.role), {expires: expireDate});
        res.send({expiresIn: 3600, user: {username: auth.username, role: auth.role}});
    }).catch( error => {
        if (error === 'USER_DOES_NOT_EXIST') {
            res.sendStatus(404);
        } else {
            res.sendStatus(500)
        }
    });
    
    return;
});
    
module.exports = router;
