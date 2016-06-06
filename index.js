$(document).ready(function(){
	$("#name").hover(function(){
    $("#menu").animate({ opacity: '1.0'});
    })   
	 

var imageArray = [
'<img src="images/media/no contact I.jpg" width="100%" height="100%">', 
'<img src="images/media/column paper.jpg" width="100%" height="100%">',
'<img src="images/media/bird paper.jpg" width="100%" height="100%">'
]

	
		
			
			$('.images').click(function(){
			$.each($('.images'), function(index, value){
					
				$('#main-screen').append(value)
			});
			})





		
				
		



}) 








	

	




