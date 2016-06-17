$(document).ready(function(){
	$("#name").hover(function(){
    $("#menu").animate({ opacity: '1.0'});
    $('body').addClass('body2');
    })   
	 

var showText = function (target, message, index, interval) {   
  if (index < message.length) {
    $(target).append(message[index++]);
    setTimeout(function () { showText(target, message, index, interval); }, interval);
  }
}


$(function () {

  showText("#name", "Snejana Simeonova", 0, 300); 
    

});

}) 













	

	




