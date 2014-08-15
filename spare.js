scraper('http://allrecipes.com/Recipe/Baked-French-Toast-2/Detail.aspx?src=recs_recipe_5', function(err, jQuery) {
		if (err) {throw err; }
	
		var o = {};
		var t = {};
		
		var $all = jQuery(".liIngredient");
		var $ingredients = jQuery(".ingredient-name");
		var $amounts = jQuery(".ingredient-amount");
	
		o.title = jQuery("#itemTitle").text();
		o.ingredients = {};
	
		t.prep = parseFloat(jQuery("#liPrep em").text()); // OR <time> tag (learn it) - how to parse. Should be easy
		t.cook = parseFloat(jQuery("#liCook em").text());
		t.total = parseFloat(jQuery("#liTotal em").text()); // UNITS
		o.time = t;
		o.rating = parseFloat(jQuery("meta[itemprop='ratingValue']").attr("content"));
	
		// next up: nutrition
	
	
		var info = [];

		for (var i = 0; i < $ingredients.length; i++) {
			var ingredient = {};
			var	name = $ingredients[i].innerHTML;
			
			ingredient.name = name;
			ingredient.amount = strParseFloat($amounts[i].innerHTML);
			//ingredient.wt = $all[i].innerHTML;
			
			info.push(ingredient);
			//info[ingredient].amount = i;
		}
		
		o.ingredients = info;
		
	
		/*
try {
			o.nutrition = jQuery("#nutritionSummary > ul").map(function() { 
				//var el = jQuery(this).find("li").text();
				return { "name" : "Test",
					"amount": "etste"
					//"unit": text2.text()
					}
			});
		} catch(e) {
			console.log(e);
			throw e; 
		}
*/

	

	
	
		// var fs = require("fs");
		// fs.writeFile("recipes.json", JSON.serialize(o));
		
	
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

		res.json(o);	
	});
