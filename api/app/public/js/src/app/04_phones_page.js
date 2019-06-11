(function () {
	
	let qrcode = new QRCode($("#qrCodeDiv")[0], {
		width: 270,
		height: 270,
		correctLevel: QRCode.CorrectLevel.M
	});

	let qrDownload = new QRCode($("#qrDownloadAppCodeDiv")[0], {
		width: 270,
		height: 270,
		correctLevel: QRCode.CorrectLevel.M
	});

	let pageLoaded = false;
	let qrModalPhoneId = "";

	$(window).load(function () {

		let apkURL = location.protocol + "//" + location.host + "/NODESMSAPP.apk";

		qrDownload.makeCode(apkURL);
		$("#apkLink").attr("href", apkURL);

		$("#phoneFilterForm").on("submit", function (event) {
			event.preventDefault();
			reloadTable();
		});

		$("#phoneModal").find("form").on("submit", function (event) {
			event.preventDefault();
			savePhone();
		});

		$(".btnAddPhone").on("click", function (event) {
			event.preventDefault();
			resetForm();
			$("#phoneModal").modal("show");
		});

		$("#phoneModal").on("show.bs.modal", function () {
			setTimeout(function () {
				$("#phoneName").focus();
			}, 500);
		});	

		$("#appLinkDownload").on("click", function (event) {
			event.preventDefault();
			$("#qr-downloadApp").modal("show");
		});

		$("#tbl_phones").next(".paginateContainer").hide();

		$(".nav-link[href='#phones-page']").on("click", function () {
			if (window.isUserAuthenticated() && !pageLoaded) {
				reloadTable();
			}
		});

		$(window).on('phoneStatusChanged', function (event, data) {
			let isPhoneOnline = data.event === "phoneConnected";
			let html_online = '<span class="glyphicon glyphicon-' + 
								(isPhoneOnline ? "check" : "unchecked") + '"></span>';

			$("#tbl_phones tbody tr[data-id='" + data.phoneId + "'] .phone-online").html(html_online);

			for (let index = 0; index < window.appState.phones.length; index++) {
				if (window.appState.phones[index]._id === data.phoneId) {
					window.appState.phones[index].online = isPhoneOnline;
					if (isPhoneOnline && qrModalPhoneId === data.phoneId){
						$("#qr-modal").modal("hide");
					}
					break;
				}
			}
		});

		$(window).on("logout", function () {
			if (pageLoaded){
				pageLoaded = false;
				window.appState.phones = [];
				renderTable();
			}
		});

	});

	function resetForm () {
		$("#phoneId").val("");
		$("#phoneName").val("");
		$("#phoneActive").prop("checked", true);
		$("#phoneModal").find(".alert-message").text("");
		$("#phoneModal").find(".alert").hide();
	}

	function savePhone () {

		$("#phoneModal").find(".alert-message").text("");
		$("#phoneModal").find(".alert").hide();	

		if ($("#phoneName").val().trim() === "") {
			$("#phoneModal").find(".alert-message").text("Phone name is required!");
			$("#phoneModal").find(".alert").show();
			return;
		}

		let jsonPhone = {
			name: $("#phoneName").val().trim(),
			active: $("#phoneActive").is(":checked")
		};

		if ($("#phoneId").val().trim() !== "") {
			jsonPhone._id = $("#phoneId").val();
		}

		$.blockUI({ message: "" });
		$("#btnSavePhone").attr("disabled", true);

		window.ajaxRequest(
			{
				method: "POST",
				url: "/phone/save",
				data: JSON.stringify(jsonPhone),
				cache: false,
				headers: {
					"Content-Type": "application/json",
					"authorization": window.appState.userToken
				},
				callback: function (err) {					
					$.unblockUI();
					$("#btnSavePhone").attr("disabled", false);

					if (err) {
						let errMessage = (err.responseText) 
											? JSON.parse(err.responseText).message
											: "Could not connect to the server! - Please try again.";
		
						$("#phoneModal").find(".alert-message").text(errMessage);
						$("#phoneModal").find(".alert").show();			
						console.log(err);
						return;
					}
		
					reloadTable();
					$("#phoneId").val("");
					$("#phoneName").val("");
					$("#phoneActive").prop("checked", false);
					$("#phoneModal").modal("hide");
				}
			}
		);
	}

	function editPhone (btn) {

		let phoneId = $(btn).closest("tr").attr("data-id");

		resetForm();
		$.blockUI({ message: "" });

		window.ajaxRequest(
			{
				method: "GET",
				url: "/phone/get/" + phoneId,
				cache: false,
				headers: {"authorization": window.appState.userToken},
				callback: function (err, phone) {
					$.unblockUI();

					if (err) {
						window.bootstrapPopup({
							header: "Error", 
							body: "Could not connect to the server!<br><br>Please try again.", 
							okButtonTxt: "Ok"
						});
						console.log(err);
					}

					$("#phoneId").val(phone._id);
					$("#phoneName").val(phone.name);
					$("#phoneActive").prop("checked", phone.active);
					$("#phoneModal").modal("show");
				}
			}
		);
	}

	function removePhone (btn) {

		let phoneId = $(btn).closest("tr").attr("data-id");

		let callback = function () {

			$.blockUI({ message: "" });

			window.ajaxRequest(
				{
					method: "DELETE",
					url: "/phone/" + phoneId,
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
			body: "Please confirm that you wish to remove this phone.", 
			okButtonTxt: "Confirm",
			okButtonType: "danger",
			cancelButtonTxt: "Cancel",
			callback: callback
		});
	}

	function viewQrCode (btn) { 

		let phoneId = $(btn).closest("tr").attr("data-id");

		$.blockUI({ message: "" });

		window.ajaxRequest(
			{
				method: "GET",
				url: "/phone/get/" + phoneId,
				cache: false,
				headers: {"authorization": window.appState.userToken},
				callback: function (err, phone) {
					$.unblockUI();

					if (err) {
						window.bootstrapPopup({
							header: "Error", 
							body: "Could not connect to the server!<br><br>Please try again.", 
							okButtonTxt: "Ok"
						});
						console.log(err);
					}	

					console.log(phone.token);

					qrModalPhoneId = phoneId;

					qrcode.clear();

					qrcode.makeCode(JSON.stringify({url: ((location.protocol.toLowerCase().indexOf("https") === 0) ? "wss://" : "ws://") + location.host, token: phone.token}));

					$("#qr-modal").modal("show");
					
				}
			}
		);

	}	

	function reloadTable () {

		$.blockUI({ message: "" });

		let searchCriteria = {};
		searchCriteria.search = $("#phoneFilterSearch").val();
		searchCriteria.active = $("#phoneFilterActive").val();	
		searchCriteria.online = $("#phoneFilterOnline").val();	

		window.ajaxRequest(
			{
				method: "GET",
				url: "/phone/list?criteria=" + JSON.stringify(searchCriteria),
				cache: false,
				headers: {"authorization": window.appState.userToken},
				callback: function (err, phones) {

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

					window.appState.phones = phones;

					renderTable();

					pageLoaded = true;

					$.unblockUI();
				}
			}
		);
	}

	function renderTable () {

		if (window.appState.phones.length === 0){
			$("#tbl_phones tbody").html('<tr><td colspan="4" class="text-center bg-danger"><strong>No record was found with the filter applied.</strong></td></tr>');
			$("#phones_pagination").html("");
			$("#tbl_phones thead").hide();
			return;
		}

		$("#tbl_phones thead").show();
		
		$("#tbl_phones tbody").paginate({
			data: window.appState.phones,
			options: {
				maxButtons: 6,
				paginator: "#phones_pagination",
				render: function (phone) {
					return `<tr data-id="${phone._id}">
						<td>${phone.name}</td>
						<td class="text-center phone-online"><span class="glyphicon glyphicon-${(phone.online ? "check" : "unchecked")}"></span></td>
						<td class="text-center"><span class="glyphicon glyphicon-${(phone.active ? "check" : "unchecked")}"></span></td>
						<td class="text-center glyphicon-btns">
							<span class="glyphicon glyphicon-qrcode" title="View token"></span>
							<span class="glyphicon glyphicon-pencil" title="Edit"></span>
							<span class="glyphicon glyphicon-remove" title="Delete"></span>
						</td>
					</tr>`;
				},
				onPageRender: function () {
					$("#tbl_phones tbody").find(".glyphicon-qrcode").on("click", function () {
						viewQrCode(this);
					});
					
					$("#tbl_phones tbody").find(".glyphicon-pencil").on("click", function () {
						editPhone(this);
					});
			
					$("#tbl_phones tbody").find(".glyphicon-remove").on("click", function () {
						removePhone(this);
					});
				}
			}
		});
	}

}());