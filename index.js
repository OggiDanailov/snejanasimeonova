$(document).ready(function(){
	$("#name").hover(function(){
    $("#menu").animate({ opacity: '1.0'});
    $('body').addClass('container2');
    $("#nav-bar").css('display', 'inline');
    $('#container').animate({opacity: 0.2}, 5000);
    }) 


	 
function showText (target, message, index, interval) {    
  if (index < message.length) { 
    $(target).append(message[index++]);
    
    
    setTimeout(function () { showText(target, message, index, interval); }, interval);
  }
}


$(function () {

  showText("#name", "Snejana Simeonova", 0, 200); 
    

});

})

function myFunction() {
    var something = document.getElementsByClassName("topnav")[0];
    something.classList.toggle("responsive");
    console.log(something)
} 













	

	




