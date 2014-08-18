// server.js


// call the packages we need
var express    = require('express'); 		// call express
var app        = express(); 				// define our app using express
var bodyParser = require('body-parser');
var scraper = require('scraper');
var natural = require('natural');
var WordPOS = require('wordpos');
var cheerio = require('cheerio');
var request = require('request');
var mongojs = require('mongojs');
var fs = require('fs');
var sass = require("node-sass");

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser());

app.use(
     sass.middleware({
      src: __dirname
    , dest: __dirname + '/css'
    , debug: true
    , outputStyle: 'compressed'
    , prefix:  '/css'
  })
);

// Open DB connection
var uri = "mongodb://localhost:27017/test",
	db = mongojs.connect(uri, ["recipes"]);


var port = process.env.PORT || 3000; 		// set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router(); 				// get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:3000/api)
/*
router.get('/scrape', function(req, res) {
	var url = 'http://allrecipes.com/Recipe/Chicken-Pot-Pie-IX/';
    		
    });
});
*/


router.get('/all', function(req, res) {
	var top = req.query.top || 10,
		offset = req.query.offset || 0;


	db.recipes.find({}).skip(offset).limit(top, function(err, records) {
		if (err) {
			res.json({"error":err});
			res.end();
			return;
		} else {
			res.json(records);
		}
	})
});


router.get('/search/:term', function(req, res) {
	res.json(req.param("term"));


	db.recipes.find({}).skip(offset).limit(top, function(err, records) {
		if (err) {
			res.json({"error":err});
			res.end();
			return;
		} else {
			res.json(records);
		}
	})
});

router.get('/list', function(req, res) {
	var url = 'http://allrecipes.com/Recipes/BBQ--Grilling/';
    request(url, function(err, resp, body) {
        if (err) {
            throw err;
        }
        $ = cheerio.load(body);
        var hrefs = [];
        $(".grid-view a.title[href*='/Recipe/']").each(function() {
	        console.log(this.attribs.href);
	        hrefs.push(this.attribs.href);
	        
        });        
        scrape(hrefs, 0);

     });
     
     //return;
});


// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

app.use(express.static(__dirname + '/'));

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);

function strParseFloat(str) {
	var base = 0;
	str = str.split(" ");
	for (var i = 0; i < str.length; i++) {
		try {
			base += eval(str[i]);
		} catch(e) {}
	}
	return base;
}

// This does the heavy lifting
function scrape(hrefs, i) {
	if (i > hrefs.length) {
		return;
	}

	var url = "http://allrecipes.com" + hrefs[i];

	request(url, function(err, resp, body) {
        if (err) {
            throw err;
        }
        $ = cheerio.load(body);
        var o = {};
		var t = {};
		
		var nounInflector = new natural.NounInflector();
		var wordpos = new WordPOS();

		wordpos.isAdjective('beers', function(result){
		    console.log(result);
		});
		wordpos.isAdjective('fresh', function(result){
		    console.log(result);
		});
		
		var $ingredients = $(".ingredient-wrap > li");
		//var $ingredients = $(".ingredient-name");
		//var $amounts = $(".ingredient-amount");
		
		//res.send($ingredients.html());
		//return;
		
	
		o.title = $("#itemTitle").text();
		o.url = url;
		o.imgSrc = $("#imgPhoto").attr("src");
		o.ingredients = {};
		
		t.prep = parseFloat($("#liPrep em").text()); // OR <time> tag (learn it) - how to parse. Should be easy
		t.cook = parseFloat($("#liCook em").text());
		t.total = parseFloat($("#liTotal em").text()); // UNITS
		o.time = t;
		o.rating = parseFloat($("meta[itemprop='ratingValue']").attr("content"));
	
		// next up: nutrition
	
	
		var info = [];

		//for (var i = 0; i < $ingredients.length; i++) {
		
		function processIngredients(i) {
			
			if (i < $ingredients.length) {
				
				var ingredient = {};
				
				var $amount = $ingredients.eq(i).find(".ingredient-amount"),
					$ingredient = $ingredients.eq(i).find(".ingredient-name");	
				
				var unit = $amount.text().replace(/\d/g,'').replace(/\s/g,'').replace('/','').replace(/ *\([^)]*\) */g, '');
				unit = (unit == "" || !unit) ? unit : nounInflector.singularize(unit);
				//unit = ni.singularize(unit);
				
				ingredient.id = $ingredients.eq(i).data("ingredientid");		
				ingredient.amount = strParseFloat($amount.text());
				ingredient.unit = unit;
				ingredient.weight = $ingredients.eq(i).data("grams");
	
				//ingredient.wt = $$amounts.eq(i).text();
				
				
				var ing = $ingredient.text().toLowerCase();
				wordpos.getPOS(ing, function(result) {
					//console.log(result);
					
					var toRemove = result.adjectives.concat(result.rest)
					toRemove.forEach(function(rem) { 
						if (result.nouns.indexOf(rem) < 0) {
							ing = ing
									.replace(rem, "")
									.replace("  "," ")
									.replace("and", "")
									.split(",")[0]
									.trim()
						}
					})
					
					ingredient.name = ing;
					info.push(ingredient);
					processIngredients(i + 1)

				})

				
			} else {
				proceed()
			}
			//info[ingredient].amount = i;
		}
		processIngredients(0)

		
		function proceed() {		
			o.ingredients = info;
			
			o.directions = $(".directions ol li").toArray().map(function(el) { return $(el).text() });	
			
			// Nutrition
			o.nutrition = $("#nutritionSummary > ul").toArray().map(function(el) { 
				el = $(el).find("li");
			
				return { 
						"name" : el.eq(0).text(),
						"amount": parseFloat(el.eq(1).text().split(" ")[0]),
						"unit": el.eq(1).text().split(" ")[1]
						}
			});
			
			db.recipes.save(o, function(err, records) {
				if (err) {
					//res.json({"error":err});
					//res.end();
					console.log(err);
					return;
				} else {
					console.log("success");
					//console.log(records);
				}
			});
			
			i++;
			scrape(hrefs, i);
			//res.json("true");
		}
	});

}

