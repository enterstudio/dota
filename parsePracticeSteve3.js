var fs = require('fs');
var cheerio = require('cheerio');
var temp = fs.readFileSync('./heroSpecific.txt').toString();

$ = cheerio.load(temp);

//console.log($("a[href^='/heroes/sniper']").first().parents('tr'));
var array = [];

//this files is a list of hero names convereted to dotabuff style;



$('tr').each(function(i,elem){
  array.push($(this).find("img").attr('alt'));
});
array.shift();
//console.log("should start here", array);
var newArr = array.map(function(el){
  return el.toLowerCase().replace(/\s/g, '-').replace("\'", '');
})
console.log("here's the new arr", newArr);


var url = 'http://www.dotabuff.com/heroes/' + newArr[i] + '/matchups';




//each(function(i, elem){
//    console.log(elem.name);
//}));
