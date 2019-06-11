(function () {

	let pageLoaded = false;

	$(window).load(function () {

		let dateFrom = new Date();
		dateFrom.setTime(dateFrom.getTime() - ((24 * 60 * 60 * 1000) * 30)); //-30 days

		$("#statsFilterFrom").datepicker({ dateFormat: "dd/mm/yy" }).datepicker("setDate", dateFrom);
		$("#statsFilterTo").datepicker({ dateFormat: "dd/mm/yy" }).datepicker("setDate", new Date());

		window.mask($("#statsFilterFrom")[0], "NN/NN/NNNN");
		window.mask($("#statsFilterTo")[0], "NN/NN/NNNN");

		$('#statsFilterForm').on("submit", function (event) {
			event.preventDefault();
			getChartData();
		});

		$(".nav-link[href='#']").on("click", function () {
			if (pageLoaded){
				setTimeout(function () {
					$("#statsContainer").highcharts().reflow();
				}, 100);
			}
			if (window.isUserAuthenticated()) {
				if (window.appState.applications.length === 0) {
					getApplicationsList();
				}else{
					populateApplications();
				}
				if (!pageLoaded){
					getChartData();
				}
			}
		});

		$(window).on("logout", function () {
			if (pageLoaded){
				pageLoaded = false;
				window.appState.applications = [];
				window.populateDropdown('#statsFilterApplication', []);
				$("#statsContainer").highcharts().destroy();
			}
		});

	});

	function getApplicationsList () {

		$.blockUI({ message: '' });

		window.ajaxRequest(
			{
				method: "GET",
				url: "/application/list",
				cache: false,
				headers: {"authorization": window.appState.userToken},
				callback: function (err, applications) {

					if (err) {
						$.unblockUI();
						window.bootstrapPopup({
							header: "Error", 
							body: "Could not connect to the server!<br><br>Please try again.", 
							okButtonTxt: "Ok"
						});
						console.log(err);
						return;
					}

					window.appState.applications = applications;

					populateApplications();

					$.unblockUI();
				}
			}
		);
	}

	function populateApplications () {
		window.populateDropdown('#statsFilterApplication', window.appState.applications);
	}

	function getChartData () {

		$.blockUI({ message: '' });

		let searchCriteria = {};
		searchCriteria.from = $("#statsFilterFrom").val();
		searchCriteria.to = $("#statsFilterTo").val();
		searchCriteria.applicationId = $("#statsFilterApplication").val();
		searchCriteria.timezoneOffset = new Date().getTimezoneOffset();

		window.ajaxRequest({
			method: 'GET',
			url: "/message/stats?criteria=" + JSON.stringify(searchCriteria),
			cache: false,
			headers: {
				"Content-Type": "application/json",
				"authorization": window.appState.userToken
			},
			callback: function (err, items) {

				if (err) {
					$.unblockUI();
					window.bootstrapPopup({
						header: "Error", 
						body: "Could not connect to the server!<br><br>Please try again.", 
						okButtonTxt: "Ok"
					});
					console.log(err);
					return;
				}

				plotChart([{
					name: 'Sent',
					data: items.sent,
					color: "#00FF00"
				}, {
					name: 'Failed',
					data: items.failed,
					color: "#FF0000"
				}]);

				pageLoaded = true;

				$.unblockUI();

			}
		});
	}

	function plotChart (data) {

		window.Highcharts.setOptions({
			time: {
				useUTC: true
			}
		});

		window.Highcharts.chart('statsContainer', {

			yAxis: {
				title: {
					text: 'Number of messages'
				},
				allowDecimals: false
			},
			xAxis: {
				type: 'datetime',
				showFirstLabel: true,
				minTickInterval: (24 * 3600 * 1000)
			},
			series: data,
			plotOptions: {
				spline: {
					marker: {
						enabled: true
					}
				}
			},
			credits: {
				enabled: false
			},
			exporting: {
				enabled: false
			},
			title: {
				text: null
			},
			subtitle: {
				text: null
			}

		});
	}
	
}());