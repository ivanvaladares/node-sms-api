(function () {
	
	let pageLoaded = false;

	$(window).load(function () {

		$("#applicationFilterForm").on("submit", function (event) {
			event.preventDefault();
			reloadTable();
		});

		$("#applicationModal").find("form").on("submit", function (event) {
			event.preventDefault();
			saveApplication();
		});

		$(".btnAddApplication").on("click", function (event) {
			event.preventDefault();
			resetForm();
			$("#applicationModal").modal("show");
		});

		$("#applicationModal").on("show.bs.modal", function () {
			setTimeout(function () {
				$("#applicationName").focus();
			}, 500);
		});

		$(".nav-link[href='#applications-page']").on("click", function () {
			if (window.isUserAuthenticated()) {
				if (!pageLoaded || window.appState.applications.length === 0) {
					reloadTable();
				}
			}
		});

		$(window).on("logout", function () {
			if (pageLoaded){
				pageLoaded = false;
				window.appState.applications = [];
				renderTable();
			}
		});

	});

	function resetForm () {
		$("#applicationId").val("");
		$("#applicationName").val("");
		$("#applicationActive").prop("checked", true);
		$("#applicationModal").find(".alert-message").text("");
		$("#applicationModal").find(".alert").hide();
	}

	function saveApplication () {

		$("#applicationModal").find(".alert-message").text("");
		$("#applicationModal").find(".alert").hide();	

		if ($("#applicationName").val().trim() === "") {
			$("#applicationModal").find(".alert-message").text("Application name is required!");
			$("#applicationModal").find(".alert").show();
			return;
		}

		let jsonApplication = {
			name: $("#applicationName").val().trim(),
			active: $("#applicationActive").is(":checked")
		};

		if ($("#applicationId").val().trim() !== "") {
			jsonApplication._id = $("#applicationId").val();
		}

		$.blockUI({ message: "" });
		$("#btnSaveApplication").attr("disabled", true);

		window.ajaxRequest(
			{
				method: "POST",
				url: "/application/save",
				data: JSON.stringify(jsonApplication),
				cache: false,
				headers: {
					"Content-Type": "application/json",
					"authorization": window.appState.userToken
				},
				callback: function (err) {					
					$.unblockUI();
					$("#btnSaveApplication").attr("disabled", false);

					if (err) {
						let errMessage = (err.responseText) 
											? JSON.parse(err.responseText).message
											: "Could not connect to the server! - Please try again.";
		
						$("#applicationModal").find(".alert-message").text(errMessage);
						$("#applicationModal").find(".alert").show();			
						return;
					}
		
					reloadTable();
					$("#applicationId").val("");
					$("#applicationName").val("");
					$("#applicationActive").prop("checked", false);
					$("#applicationModal").modal("hide");
				}
			}
		);
	}

	function editApplication (btn) {

		let applicationId = $(btn).closest("tr").attr("data-id");

		resetForm();
		$.blockUI({ message: "" });

		window.ajaxRequest(
			{
				method: "GET",
				url: "/application/get/" + applicationId,
				cache: false,
				headers: {"authorization": window.appState.userToken},
				callback: function (err, application) {
					$.unblockUI();

					if (err) {
						window.bootstrapPopup({
							header: "Error", 
							body: "Could not connect to the server!<br><br>Please try again.", 
							okButtonTxt: "Ok"
						});
						console.log(err);
					}

					$("#applicationId").val(application._id);
					$("#applicationName").val(application.name);
					$("#applicationActive").prop("checked", application.active);
					$("#applicationModal").modal("show");
				}
			}
		);
	}

	function removeApplication (btn) {

		let applicationId = $(btn).closest("tr").attr("data-id");

		let callback = function () {

			$.blockUI({ message: "" });

			window.ajaxRequest(
				{
					method: "DELETE",
					url: "/application/" + applicationId,
					cache: false,
					headers: {"authorization": window.appState.userToken},
					callback: function (err) {
						if (err) {
							$.unblockUI();
							window.bootstrapPopup({
								header: "Error", 
								body: "Could not connect to the server!<br><br>Please try again.", 
								okButtonTxt: "Ok"
							});
							console.log(err);
						}
						reloadTable();
					}
				}
			);
		};

		window.bootstrapPopup({
			header: "Confirmation", 
			body: "Please confirm that you wish to remove this application.", 
			okButtonTxt: "Confirm",
			okButtonType: "danger",
			cancelButtonTxt: "Cancel",
			callback: callback
		});
	}

	function viewApplication (btn) { 

		let applicationId = $(btn).closest("tr").attr("data-id");

		$.blockUI({ message: "" });

		window.ajaxRequest(
			{
				method: "GET",
				url: "/application/get/" + applicationId,
				cache: false,
				headers: {"authorization": window.appState.userToken},
				callback: function (err, application) {
					$.unblockUI();

					if (err) {
						window.bootstrapPopup({
							header: "Error", 
							body: "Could not connect to the server!<br><br>Please try again.", 
							okButtonTxt: "Ok"
						});
						console.log(err);
					}	
				
					let viewApp = {
						Name: application.name,
						Messages: application.totalMessages,
						Token: application.token,
						Active: (application.active ? "Yes" : "No")
					};

					window.bootstrapPopup({
						header: "Application details", 
						body: window.jsonToHTMLTable(viewApp), 
						okButtonTxt: "Ok"
					});
					
				}

			}
		);

	}	

	function reloadTable () {

		$.blockUI({ message: "" });

		let searchCriteria = {};
		searchCriteria.search = $("#applicationFilterSearch").val();
		searchCriteria.active = $("#applicationFilterActive").val();	

		window.ajaxRequest(
			{
				method: "GET",
				url: "/application/list?criteria=" + JSON.stringify(searchCriteria),
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

					renderTable();

					pageLoaded = true;

					$.unblockUI();
				}
			}
		);
	}

	function renderTable () {

		if (window.appState.applications.length === 0){
			$("#tbl_applications tbody").html('<tr><td colspan="4" class="text-center bg-danger"><strong>No record was found with the filter applied.</strong></td></tr>');
			$("#applications_pagination").html("");
			$("#tbl_applications thead").hide();
			return;
		}

		$("#tbl_applications thead").show();
		
		$("#tbl_applications tbody").paginate({
			data: window.appState.applications,
			options: {
				maxButtons: 6,
				paginator: "#applications_pagination",				
				render: function (application) {
					return `<tr data-id="${application._id}">
						<td>${application.name}</td>
						<td class="text-center"><span class="glyphicon glyphicon-${(application.active ? "check" : "unchecked")}"></span></td>
						<td class="text-center glyphicon-btns">
							<span class="glyphicon glyphicon-eye-open" title="View details"></span>
							<span class="glyphicon glyphicon-pencil" title="Edit"></span>
							<span class="glyphicon glyphicon-remove" title="Delete"></span>
						</td>
					</tr>`;
				},
				onPageRender: function () {
					$("#tbl_applications tbody").find(".glyphicon-eye-open").on("click", function () {
						viewApplication(this);
					});
					
					$("#tbl_applications tbody").find(".glyphicon-pencil").on("click", function () {
						editApplication(this);
					});
			
					$("#tbl_applications tbody").find(".glyphicon-remove").on("click", function () {
						removeApplication(this);
					});
				}
			}
		});
	}
	
}());