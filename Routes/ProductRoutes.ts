import {getAllProductInformation} from "../Services/ProductService";
import {authenticate, checkRoles} from "../Services/SecurityService";
const router = require('express').Router();

router.get('/products/', authenticate, (req, res) => {
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