let str = "Hi I'm Tony";
str.replace(/\b\w+\b/g,function(word,first,second){
    console.log(word);
    console.log(first);
    console.log(second);
    return null;
})
