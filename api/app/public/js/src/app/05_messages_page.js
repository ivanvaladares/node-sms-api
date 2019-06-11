(function () {

	let pageLoaded = false;

	$(window).load(function () {

		let dateFrom = new Date();
		dateFrom.setTime(dateFrom.getTime() - ((24 * 60 * 60 * 1000) * 3)); //-3 days

		$("#messageFilterFrom").datepicker({ dateFormat: "dd/mm/yy" }).datepicker("setDate", dateFrom);
		$("#messageFilterTo").datepicker({ dateFormat: "dd/mm/yy" }).datepicker("setDate", new Date());

		window.mask($("#messageFilterFrom")[0], "NN/NN/NNNN");
		window.mask($("#messageFilterTo")[0], "NN/NN/NNNN");

		$("#messageFilterForm").on("submit", function (event) {
			event.preventDefault();
			reloadTable();
		});

		$(".btnAddMessage").on("click", function (event) {
			event.preventDefault();
			showMessageForm();
		});

		$("#messageModal").find("form").on("submit", function (event) {
			event.preventDefault();
			saveMessage();
		});

		$("#messageModal").on("show.bs.modal", function () {
			setTimeout(function () {
				$("#messageApplication").focus();
			}, 500);
		});	

		$("#tbl_messages").next(".paginateContainer").hide();

		$(".nav-link[href='#messages-page']").on("click", function () {
			if (window.isUserAuthenticated() && !pageLoaded) {
				reloadTable();
			}
		});

		$(window).on("logout", function () {
			if (pageLoaded){
				pageLoaded = false;
				window.appState.messages = [];
				renderTable();
			}
		});		

	});

	function resetForm () {
		$('#messageApplication').val("");
		$("#messagePhone").val("");
		$("#messageBody").val("");
		$("#messageModal").find(".alert-message").text("");
		$("#messageModal").find(".alert").hide();
	}

	function showMessageForm () {
		resetForm();

		if (window.appState.applications.length > 0){
			populateApplications();
			$("#messageModal").modal("show");
			return;
		}

		$.blockUI({ message: "" });

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

					$("#messageModal").modal("show");
					
					$.unblockUI();
				}
			}
		);
	}

	function populateApplications () {
		window.populateDropdown('#messageApplication', window.appState.applications);
	}

	function saveMessage () {

		$("#messageModal").find(".alert-message").text("");
		$("#messageModal").find(".alert").hide();

		if ($("#messageApplication").val() === "" || $("#messagePhone").val().trim() === "" || $("#messageBody").val().trim() === "") {
			$("#messageModal").find(".alert-message").text("All fields are required!");
			$("#messageModal").find(".alert").show();
			return;
		}

		let jsonMessage = {
			application: $("#messageApplication").val(),
			phone: $("#messagePhone").val(),
			body: $("#messageBody").val().trim()
		};

		$.blockUI({ message: "" });
		$("#btnSaveMessage").attr("disabled", true);

		window.ajaxRequest(
			{
				method: "POST",
				url: "/message/send",
				data: JSON.stringify(jsonMessage),
				cache: false,
				headers: {
					"Content-Type": "application/json",
					"authorization": window.appState.userToken
				},
				callback: function (err) {
					$.unblockUI();
					$("#btnSaveMessage").attr("disabled", false);

					if (err) {
						let errMessage = (err.responseText)
						? JSON.parse(err.responseText).message
						: "Could not connect to the server! - Please try again.";

						$("#messageModal").find(".alert-message").text(errMessage);
						$("#messageModal").find(".alert").show();
						console.log(err);
						return;
					}					

					reloadTable();
					$("#messagePhone").val("");
					$("#messageBody").val("");
					$("#messageModal").modal("hide");
				}
			}
		);
	}

	function viewMessage (btn) {

		let messageId = $(btn).closest("tr").attr("data-id");

		$.blockUI({ message: "" });

		window.ajaxRequest(
			{
				method: "GET",
				url: "/message/get/" + messageId,
				cache: false,
				headers: { "authorization": window.appState.userToken },
				callback: function (err, message) {

					$.unblockUI();

					if (err){
						window.bootstrapPopup({
							header: "Error", 
							body: "Could not connect to the server!<br><br>Please try again.", 
							okButtonTxt: "Ok"
						});
						console.log(err);
						return;
					}

					let viewMsg = {
						Id: message._id,
						Phone: message.phone,
						Body: message.body.replace("\n", "<br />"),
						Date: new moment(message.date).format('DD-MMM-YYYY hh:mm:ss'),
						Status: message.status
					};				

					window.bootstrapPopup({
						header: "Message details", 
						body: window.jsonToHTMLTable(viewMsg), 
						okButtonTxt: "Ok"
					});

				}
			}
		);

	}

	function reloadTable () {

		$.blockUI({ message: "" });

		let searchCriteria = {};
		searchCriteria.search = $("#messageFilterSearch").val();
		searchCriteria.from = $("#messageFilterFrom").val();
		searchCriteria.to = $("#messageFilterTo").val();
		searchCriteria.status = $("#messageFilterStatus").val();
		searchCriteria.timezoneOffset = new Date().getTimezoneOffset();

		window.ajaxRequest(
			{
				method: "GET",
				url: "/message/list?criteria=" + JSON.stringify(searchCriteria),
				cache: false,
				headers: {"authorization": window.appState.userToken},
				callback: function (err, messages) {

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

					window.appState.messages = messages;

					renderTable();

					pageLoaded = true;

					$.unblockUI();
				}
			}
		);
	}

	function renderTable () {

		if (window.appState.messages.length === 0){
			$("#tbl_messages tbody").html('<tr><td colspan="4" class="text-center bg-danger"><strong>No record was found with the filter applied.</strong></td></tr>');
			$("#messages_pagination").html("");
			$("#tbl_messages thead").hide();
			return;
		}

		$("#tbl_messages thead").show();
		
		$("#tbl_messages tbody").paginate({
			data: window.appState.messages,
			options: {
				maxButtons: 6,
				paginator: "#messages_pagination",
				render: function (message) {
					return `<tr data-id="${message._id}">
						<td>${message.phone}</td>
						<td>${new moment(message.date).format('DD/MM/YYYY HH:mm:ss')}</td>
						<td class="text-center"><span class="glyphicon glyphicon-${(message.status === "SENT" ? "check" : "unchecked")}"></span></td>
						<td class="text-center glyphicon-btns">
							<span class="glyphicon glyphicon-eye-open" title="View details"></span>
						</td>
						</tr>`;
				},
				onPageRender: function () {
					$("#tbl_messages tbody").find(".glyphicon-eye-open").on("click", function () {
						viewMessage(this);
					});
				}
			}
        });
	}

}());