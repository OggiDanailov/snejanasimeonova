$(document).ready(function(){
	$("#name").hover(function(){
    $("#menu").animate({ opacity: '1.0'});
    $('body').addClass('container2');
    $(".clearfix").css('display', 'inline');
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



$(function() {
  var pull = $('#pull');
      menu = $('nav ul');
      menuHeight  = menu.height();
 
  $(pull).on('click', function(e) {
      e.preventDefault();
      menu.slideToggle();
    });
});

$(window).resize(function(){
    var w = $(window).width();
    if(w > 620 && menu.is(':hidden')) {
        menu.removeAttr('style');
    }
});


}) 













	

	




