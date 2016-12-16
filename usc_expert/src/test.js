var fbManager = require('./fb_manager');

var fb = new fbManager("EAAJZAbxXrAugBAHFDJqiB6NducoAPUNNflV8l51n2Gcg8oYrp0bJPC93rwMXLTOz0sOyqcQXXkynSLcdq1W0H8NjgfducvRs96EZAp1xv4rtVLCR3za9JonUBhUpZBx4Vve9qo60lN9bFwCX5STwtY4ZAMFqqdUZD");

var p = fb.getAllEvents();
p.then(function (arr) {
    console.log(arr);
});