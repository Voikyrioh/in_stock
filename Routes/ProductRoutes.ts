import {getAllProductInformation, getAllUserProducts, getUserProduct} from "../Services/ProductService";
import {authenticate, checkRoles} from "../Services/SecurityService";
const router = require('express').Router();

router.get('/products/', authenticate, (req, res) => {
    if (!checkRoles(res, 'RETARDED')) {
        return;
    }
    getAllUserProducts(res.userId).then(value => {
        res.send(value);
        return;
    }).catch(err => {
        console.error(err);
        res.sendStatus(500);
        return;
    })
})

router.get('/product/:id', authenticate, (req, res) => {
    if (!checkRoles(res, 'RETARDED')) {
        return;
    }

    if (!req?.params?.id || Number.parseInt(req.params.id, 10) === Number.NaN) {
        res.sendStatus(400);
        return;
    }

    getUserProduct(res.userId, req.params.id).then(value => {
        if (!value) {
            res.sendStatus(404);
            return;
        }
        res.send(value);
        return;
    }).catch(err => {
        console.error(err);
        res.sendStatus(500);
        return;
    })
})

router.get('/products/all/', authenticate, (req, res) => {
    if (!checkRoles(res, 'ADMINIDIOT')) {
        return;
    }
    getAllProductInformation().then(value => {
        res.send(value);
        return;
    }).catch(err => {
        console.error(err);
        res.sendStatus(500);
        return;
    })
})

module.exports = router;
