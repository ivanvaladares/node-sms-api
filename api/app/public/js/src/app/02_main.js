(function () {

	var wsSocket = null;

	$(window).on("load", function () {

		$(".nav-link").on("click", function (event) {
			event.preventDefault();

			if (!window.isUserAuthenticated()) {
				return;
			}

			var title = $(this).text();
			window.appState.activePage = $(this).attr("href");
		
			if (window.appState.activePage === "#") {
				window.appState.activePage = "#stats-page";
				title = "/admin/";
			}

			$(".nav-link").parent().removeClass("active");
			$(".nav-link[href='" + window.appState.activePage + "']").parent().addClass("active");
		
			$(".page").hide();
		
			$(window.appState.activePage).show();
		
			$("#myNavbar").collapse("hide");

			var URLarr = window.document.URL.split('/');
			var lastURLSegment = URLarr.pop() || URLarr.pop();
			if (title.toLowerCase() === lastURLSegment.toLowerCase()){
				return;
			}

			if (history !== null && history.state !== null && history.state.activePage !== null) {
				if (history.state.activePage === window.appState.activePage) {
					return;
				}
			}
			
			var stateObj = { activePage: window.appState.activePage, title: title };
			history.pushState(stateObj, title, title);
		});

		$('#login-modal').find('form').on("submit", function (event) {
			event.preventDefault();
			performLogin();
		});

		$('#login-modal').on('show.bs.modal', function () {

			$('#login-modal').find(".alert-message").text("");
			$('#login-modal').find(".alert").hide();			
	
			setTimeout(function () {
				$("#userName").focus();
				$("#userName").select();
			}, 500);
		});

		$('#newUser-modal').find('form').on("submit", function (event) {
			event.preventDefault();
			createNewUser();
		});

		$('#newUser-modal').on('show.bs.modal', function () {
			setTimeout(function () {
				$("#newUser_userName").focus();
				$("#newUser_userName").select();
			}, 500);
		});

		$("#btn-new-user").on("click", function (event) {
			$('#login-modal').modal('hide');
			$('#newUser-modal').modal('show');
			$('#newUser-modal').find('.alert').hide();

			event.preventDefault();
		});

		$("#btn-cancel-newUser").on("click", function (event) {
			$('#newUser-modal').modal('hide');
			$('#login-modal').modal('show');
			event.preventDefault();
		});

		$(".btn-filter").on("click", function (event) {
			event.preventDefault();
			$(this).next().toggleClass("hidden-xs", 500);
		});

		$(".logoutBtn").on("click", function (event) {
			event.preventDefault();
			window.logout();
		});


		$(".loading").hide();
		$("#app").show();

		if (sessionStorage.getItem("userToken") !== null){
			
			window.login(sessionStorage.getItem("userToken").trim());
			openWebSocket();

			setTimeout(function (){
				var parts = window.document.URL.split('/');
				var lastSegment = parts.pop() || parts.pop();
				if ($(".nav-link[href='#" + lastSegment.toLowerCase() + "-page']").length > 0) {
					$(".nav-link[href='#" + lastSegment.toLowerCase() + "-page']").trigger("click");
				}else{
					$(".nav-link[href='#']").trigger("click");
				}				
			}, 200);
		}else{
			window.isUserAuthenticated();
		}

		setInterval(refreshToken, 1000); //1 secs
	});

	$(window).on("load resize", function () {
		$("body").css("margin-top", parseInt($(".navbar-header").css("height")) + 10); 
	});

	function createNewUser () {

		if ($("#newUser_userName").val().trim() === "" || $("#newUser_userPass").val().trim() === "" || $("#newUser_userPassRepeated").val().trim() === "") {
			$('#newUser-modal').find('.alert-message').text("Please fill out all fields!");
			$('#newUser-modal').find('.alert').show();
			return;
		}

		var jsonUser = {
			userName: $("#newUser_userName").val().trim(),
			userPass: $("#newUser_userPass").val().trim(),
			userPassRepeated: $("#newUser_userPassRepeated").val().trim()
		};

		$("#btn-newUser-ok").attr("disabled", true);

		window.ajaxRequest(
			{
				url: "/user/create",
				method: "POST",
				data: JSON.stringify(jsonUser),
				headers: {"Content-Type": "application/json"},
				callback: function (err, token) {
					$("#btn-newUser-ok").attr("disabled", false);

					if (err) {
						$('#newUser-modal').find('.alert-message').text(JSON.parse(err.responseText).message);
						$('#newUser-modal').find('.alert').show();
						console.log(err);
						return;
					}
		
					window.login(token);
					openWebSocket();

					$("#newUser_userName").val("");
					$("#newUser_userPassRepeated").val("");
					$("#newUser_userPass").val("");
	
					$('#newUser-modal').modal('hide');
					$(".nav-link[href='#']").trigger("click");		
				}
			}
		);	
	}

	function performLogin () {

		if ($("#userName").val().trim() === "" || $("#userPass").val().trim() === "") {
			$('#login-modal').find('.alert-message').text("Username and password are required!");
			$('#login-modal').find('.alert').show();
			return;
		}

		var jsonUser = {
			userName: $("#userName").val().trim(),
			userPass: $("#userPass").val().trim()
		};

		$("#btn-login-ok").attr("disabled", true);

		window.ajaxRequest(
			{
				url: "/user/login",
				method: "POST",
				data: JSON.stringify(jsonUser),
				headers: {"Content-Type": "application/json"},
				callback: function (err, token) {
					$("#btn-login-ok").attr("disabled", false);

					if (err) {
						$('#login-modal').find('.alert-message').text("Username or password is incorrect!");
						$('#login-modal').find('.alert').show();
						console.log(err);
						return;
					}

					window.login(token);
					openWebSocket();
	
					$("#userName").val("");
					$("#userPass").val("");
					$('#login-modal').modal('hide');

					$(".nav-link[href='#']").trigger("click");		
				}
			}
		);
	}

	function refreshToken () {

		if (window.appState.userToken === "") {
			return;
		}

		var currentTime = new Date().getTime();
		var difTime = currentTime - window.appState.lastTokenRefreshTime;

		if (difTime < 300000) {  // 5 min
			return;
		}

		if (difTime > 1200000) { // 20 min
			window.logout();
			return;
		}

		window.appState.lastTokenRefreshTime = currentTime;
		
		window.ajaxRequest(
			{
				url: "/user/refreshToken",
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"authorization": window.appState.userToken
				},
				callback: function (err, resp) {

					if (err) {
						if (err.status && (err.status === 400 || err.status === 401)){
							window.logout();
						}
						console.log(err);
						return;
					}
		
					window.appState.userToken = resp;
					sessionStorage.setItem("userToken", resp);	
				}
			}
		);
	}

	function openWebSocket () {

		if (window.appState.userToken === ""){
			return;
		}

		if ("WebSocket" in window) {
			let address = ((location.protocol.toLowerCase().indexOf("https") === 0) ? "wss://" : "ws://") + location.host;
			address += "?token=" + window.appState.userToken;

			wsSocket = new WebSocket(address);

			wsSocket.onopen = () => {
				console.log("Websocket connected!");
			};

			wsSocket.onmessage = (event) => {
				try {

					var message = JSON.parse(event.data);

					if (message.event === "phoneDisconnected" || message.event === "phoneConnected") {
						$(window).trigger('phoneStatusChanged', {event: message.event, phoneId: message.phoneId});
					}

				} catch (err) {
					//nothing
				} 
			};

			wsSocket.onclose = () => {
				console.log("Websocket closed!");
				// Try to reconnect in 1 second
				setTimeout(openWebSocket, 1000);

				window.logout();
			};
		}
	}
	
}());