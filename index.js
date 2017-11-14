const express = require('express')
const app = express()
var _ = require("underscore")
session = require('express-session'),
    bodyParse = require('body-parser'),
    ejs = require('ejs'),
    mongoose = require('mongoose');

var QRCode = require('qrcode')
mongoose.Promise = global.Promise;
const collection = mongoose.connect('mongodb://localhost/product', (err) => {
    console.log('connected db')
});

var Products = mongoose.model('products', mongoose.Schema({
    name: {
        type: String,
        required: true,
        validate: {
            validator: function (name) {
                var length = name.length
                return (length >= 5 && length <= 100) && (/[a-zA-Z0-9]/.test(name));
            },
            message: 'name is only letter and number and 5<= length <= 100'
        },
    },
    description: {
        type: String,
        required: true,
        validate: {
            validator: function (description) {
                var length = description.length
                return (length >= 5 && length <= 100);
            },
            message: 'Desciption length must be between 20 and 500'
        },
    },
    price: {
        type: Number,
        validate: {
            validator: function (price) {
                return (price >= 1);
            },
            message: 'Price must be green be greater than zero'
        },
    }
}));

var Carts = mongoose.model('carts', mongoose.Schema({
    productId: [String],
}));

app.listen(3000, () => {
    console.log('listen on port 3000: http://localhost:3000/list')
});

app.use(bodyParse.urlencoded());
app.use(bodyParse.json());

app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: true,
    // store: new Carts,
    saveUninitialized: true
}));

app.get('/addprod', (req, res) => {
    ejs.renderFile('./views/AddProd.ejs', {}, (err, html) => {
        res.end(html)
    })
})

app.post('/addprod', (req, res) => {
    Products.create(req.body, function (err, prod) {
        if (err) {
            var listErr = err.errors
            res.json(err)


            ejs.renderFile('./views/AddProd.ejs', { listErr }, (err, html) => {
                res.end(html)
            })
        } else {
            res.redirect('/list');
            console.log('added')
        }
    })
})


app.get(['/list','/'], (req, res) => {
    QRCode.toDataURL('I am a pony!', function (err, url) {
        console.log(url)
    })
    var s = req.param('searchText')
    var r = req.param('range')
    var trigger = {
        "name": new RegExp(s,'i')
    }
    if (r !== undefined){
        var rArr = r.split(",").map(function (val) { return +val; }); 
        console.log(rArr)
        trigger["price"] = { $gt :  rArr[0], $lt : rArr[1]}
    }
    console.log(trigger)
    Products.find( trigger ,function (err, list) {
        // res.json(list)
        ejs.renderFile('./views/ListProduct.ejs', { list }, (err, html) => {
            res.end(html);
        });
    })
})

app.get('/additem/:id', (req, res) => {
    console.log('------------ADD ITEM------------')
    var productId = req.params.id;

    //if cart in session is undefined then create a new cart
    var cart = req.session.cart == undefined ? {} : req.session.cart

    cart[productId] = cart[productId] == undefined ? 1 : cart[productId] + 1
    req.session.cart = cart
    console.log('---->session/ update 🛒 :', req.session.cart)
    res.redirect('/list');
});

app.get('/cart', (req, res) => {

    var cart = req.session.cart == undefined ? {} : req.session.cart

    var listProd = []
    var numOfKey = 0
    for (var key in cart) {
        numOfKey++;
        Products.findOne({ _id: key }, function (err, prod) {
            console.log(prod)
            prod['number'] = cart[key]
            listProd.push(prod)
            complete = true
            numOfKey--
            if (numOfKey == 0) {
                // res.json(listProd)
                ejs.renderFile('./views/cart.ejs', { listProd }, (err, html) => {
                    res.end(html);
                });
            }
        })
    }

    if (numOfKey == 0) {
        res.redirect('/list')
    }
});
app.get('/delete/:id', (req, res) => {
    console.log('------------DEL ITEM------------')
    var productId = req.params.id;
    var cart = req.session.cart
    delete cart[productId]

    console.log(cart)
    req.session.cart = cart
    res.redirect('/cart')
})
