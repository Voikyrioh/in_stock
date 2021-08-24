import {
    authRetarded,
    createRetarded,
    getAllRetardeds,
    getRetardedById,
    getRetardedByUsername,
    updateRetarded
} from "../Services/RetardedService";
import {
    authenticate,
    checkPasswordSecurity,
    checkRequiredBodyFields, checkRoles,
    generateAccessToken, hashPassword, Roles
} from "../Services/SecurityService";
import {RetardedAttribute, RetardedInfo} from "../Models/RetardedModels";

const router = require('express').Router();

router.get('/users/', authenticate, (req, res) => {
   if (!checkRoles(res, Roles[2])) {
       res.status(401);
       res.send();
       return;
   }

   getAllRetardeds().then(retardeds => {
       res.send(retardeds);
   }).catch(error => {
       res.sendStatus(500);
   })
});

router.get('/user/:id', authenticate, (req, res) => {
    const userId = Number.parseInt(req.params.id, 10);

    if (!userId || Number.isNaN(userId)) {
        res.sendStatus(400);
        return;
    }

    if (userId !== res.userId && (!res.role || res.role !== 'ADMINIDIOT')) {
        res.sendStatus(403);
        return;
    }

    getRetardedById(userId).then((user) => {
       if (!user) {
           res.sendStatus(404);
           return;
       }

       const anoUser: RetardedInfo = {
           id: user.id,
           username: user.username,
           role: user.role,
           email: user.email,
           firstname: user.firstname,
           lastname: user.lastname
       }
       res.send(anoUser);
    });
})

router.put('/user/update', authenticate, (req, res) => {
    const requestUser = req.body;

    if (requestUser.id !== res.userId && (!res.role || res.role !== 'ADMINIDIOT')) {
        res.sendStatus(403);
        return;
    }

    getRetardedById(requestUser.id).then(async (user) => {
        if (!user) {
            res.sendStatus(404);
            return;
        }

        // If user decide to change username, check if new username is already in use
        if (user.username !== requestUser.username) {
            if (await getRetardedByUsername(requestUser.username)) {
                res.sendStatus(400);
                return;
            }
        }

        if (requestUser.password) {
            if (checkPasswordSecurity(requestUser.password)) {
                res.status(400);
                res.statusMessage = checkPasswordSecurity(requestUser.password);
                res.send();
                return;
            }
            const newPassword = await hashPassword(requestUser.password);
            requestUser.password = newPassword.hash;
            requestUser.salt = newPassword.salt;
        }

        const updateUser: RetardedAttribute = { ...user, ...requestUser };

        updateRetarded(updateUser).then(updateResult => {
            getRetardedById(updateUser.id).then(updatedUser => {
                res.send({
                    id: updatedUser.id,
                    username: updatedUser.username,
                    role: updatedUser.role,
                    email: updatedUser.email,
                    firstname: updatedUser.firstname,
                    lastname: updatedUser.lastname
                });
            })
        }).catch(error => {
            console.error(error);
            res.sendStatus(500);
        })
    });
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
            res.send({expiresIn: 3600, user: {id: newRetarded.id , username: newRetarded.username, role: newRetarded.role}});

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
        res.send({expiresIn: 3600, user: {id: auth.id, username: auth.username, role: auth.role}});
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
