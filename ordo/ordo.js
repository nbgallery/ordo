define([
	'jquery',
	'base/js/namespace',
	'base/js/events',
	'base/js/dialog'
],  function(
	$,
	Jupyter,
	events,
	dialog
) {
	console.log("...Ordo loaded... grading capabilities initiated");
	var defaultSuccess = "";
	var defaultFailure = "";

	/**
	 * reads configuration properties containing default feedback responses for the plugin
	 */
	var readConfig = function() {
		var config = Jupyter.notebook.config;

		if (config.data.hasOwnProperty('ordo_default_failure')){
			console.log("Found: ordo_default_failure property")
			defaultFailure = config.data['ordo_default_failure'];
		}
		if (config.data.hasOwnProperty('ordo_default_success')){
			console.log("Found: ordo_default_success")
			defaultSuccess = config.data['ordo_default_success'];
		}
	};

	/**
	 *  Capture output_appended.OutputArea event for the result value
	 *  Capture finished_execute.CodeCell event for the data value
	 *  check for a solution in cell metadata
	 *  if exists:
	 *    check only one area appended (ends recursion)
	 *    if true:
	 *      check result against solution
	 *      if result correct:
	 *        append the success message
	 *      if result incorrect:
	 *        append the failure message
	 */
	var ordoFeedback = function () {
		events.on('output_appended.OutputArea', function(event,type,result,md,html) {
			events.on('finished_execute.CodeCell', function(evt, obj){
				solution = obj.cell.metadata.ordo_solution;
				if (solution != undefined) {
					if (html.parent().parent().children().toArray().length == 1) {
						if(obj.cell.metadata.ordo_verify == undefined) {
							feedback = ordoFeedbackMessage(equals(solution,obj.cell.output_area.outputs[0].data),
																  obj.cell.metadata.ordo_success, 
																  obj.cell.metadata.ordo_failure);
						} else {
							feedback = obj.cell.metadata.ordo_verify(obj.cell.output_area.outputs[0].data, 
																	 obj.cell.metadata.ordo_success, 
																	 obj.cell.metadata.ordo_failure);
						}
						obj.cell.output_area.append_output({
							"output_type" : "display_data",
							"data" : {
								"text/html": feedback
							},
							"metadata" : {}
						});
					}
				}
			});
		});
	}

	/**
	 * returns the div containing the 
	 * @param {boolean} correct - if the submitted solutions was correct or not
	 * @param {string} success_msg - the success message for the current cell, if defined
	 * @param {string} failure_msg - the failure message for the current cell, if defined 
	 */
	var ordoFeedbackMessage =  function(correct,success_msg,failure_msg) {
		if(correct) {
			if (success_msg == undefined && defaultSuccess == "") {
				feedback = "<div class='alert alert-success alert-dismissible ordo_feedback' role='alert'> " + 
						   "<button type='button' class='close' data-dismiss='alert'>&times;</button> " + 
						   "<strong>Well Done!</strong> That was the correct response. " + 
						   " </div>"
			} else if (success_msg == undefined && defaultSuccess) {
				feedback = "<div class='alert alert-success alert-dismissible ordo_feedback' role='alert'> " + 
						   "<button type='button' class='close' data-dismiss='alert'>&times;</button>" + 
						   defaultSuccess + 
						   "</div>"
			} else {
				feedback = "<div class='alert alert-success alert-dismissible ordo_feedback' role='alert'> " + 
						   "<button type='button' class='close' data-dismiss='alert'>&times;</button>" + 
						   success_msg + 
						   "</div>"
			}
		} else {
			if (failure_msg == undefined) {
				feedback = "<div class='alert alert-danger alert-dismissible ordo_feedback' role='alert'> " + 
						   "<button type='button' class='close' data-dismiss='alert'>&times;</button> " + 
						   "<strong>Oh no!</strong> That wasn't quite right. " + 
						   "</div>"
			} else if (failure_msg == undefined && defaultFailure) {
				feedback = "<div class='alert alert-danger alert-dismissible ordo_feedback' role='alert'> " +
						   "<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
						   defaultFailure + 
						   "</div>"
			} else {
				feedback = "<div class='alert alert-danger alert-dismissible ordo_feedback' role='alert'>" + 
						   "<button type='button' class='close' data-dismiss='alert'>&times;</button>" + 
						   failure_msg  + 
						   "</div>"
			}
		}
		return feedback;
	}

	/**
	 * tests two metadata objects for equality
	 * @param {Object} obj1 
	 * @param {Object} obj2 
	 */
	var equals = function(obj1, obj2) {
		for(var p in obj1){
			if(obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;
			switch(typeof(obj1[p])) {
				case 'object':
					if(!equals(obj1[p],obj2[p])) return false;
					break;
				case 'function':
					if(typeof(obj2[p]) == undefined || (p != equals && obj1[p].toString() != obj2[p].toString())) return false;
					break;
				default:
					if(obj1[p] != obj2[p]) return false;
			}
		}
		for(var p in obj2) {
			if(typeof(obj1[p]) == undefined) return false;
		}
		return true;
	}
	/** 
	 *  Capture select cell event for the cell data
	 *  check cell type is code
	 *  if true:
	 *    check the cell is the same as the formerly selected cell
	 *    if true:
	 *      return with no action
	 *    if false:
	 *      Remove the button from the formerly selected cell
	 *      check if the cell has been run already
	 *      if true:
	 *        append a button for the user to click which will:
	 *        make ordo_solution = output_area.outputs[0]
	 */
	var makeOutputButton = function () {
		var currCell = undefined;
		events.on('select.Cell', function(event, data) {
			newCell = data.cell;
			if(newCell == currCell){
				return;
			} else if($('.ordo_edit_mode').length == 0) {
				return;
			} else {
				$(".show-ordo-solution").remove();
				$(".make-ordo-solution").remove();
				currCell = newCell;
				if(currCell.cell_type == "code") {
					if(currCell.output_area.outputs.length > 0){
						if(currCell.output_area.outputs[0].output_type == "execute_result") {
							$(".selected .output_area")
							.first()
							.append("<button type='button' class='btn btn-primary make-ordo-solution'>make solution</button>");
							$(".make-ordo-solution").on("click", function() {
								console.log("updated metadata");
								currCell.metadata.ordo_solution = currCell.output_area.outputs[0].data;
							});
						}
					}
				}
			}
		}); 
	}

	/**
	 * @param {Object} solution - 
	 * returns the correct solution in the appropriate format
	 */
	var solutionToString = function (solution) {
		var outStr = "";
		console.log(solution)	
		for (var key in solution) {
			switch (key){
				case 'text/html':
					return solution[key];
					break;
				case 'text/plain':
					return solution[key];
					break;
				default:
					outStr = 'N/A';
			}
		}
		return outStr;
	}

	/**
	 * 
	 * creates a button to show the current solution to the user
	 */
	var showSolutionButton = function () {
		var currCell = undefined;
		events.on('select.Cell', function(event, data) {
			newCell = data.cell;
			if(newCell == currCell){
				return;
			} else if($('.ordo_feedback_mode').length == 0) {
				return;
			} else {
				$(".show-ordo-solution").remove();
				currCell = newCell;
				if(currCell.cell_type == "code" && currCell.metadata && currCell.metadata.ordo_solution) {
					if(currCell.output_area.outputs.length > 0){
						if(currCell.output_area.outputs[0].output_type == "execute_result") {
							$(".selected .output_area")
							.first()
							.append("<button type='button' class='btn fa fa-eye show-ordo-solution'></button>");
							$(".show-ordo-solution").on("click", function() {
								//currCell.metadata.ordo_solution = currCell.output_area.outputs[0].data;
								solution = solutionToString(currCell.metadata.ordo_solution)
								console.log("Current solution => " + solution);
								feedback = "<div class='alert alert-info alert-dismissible show-ordo-solution' role='alert'>" + 
												   "<button type='button' class='close' data-dismiss='alert'>&times;</button> " + 
												   "<stron> Solution is: </strong>" + solution  + " </div>"
								currCell.output_area.append_output({
									"output_type" : "display_data",
									"data" : {
										"text/html": feedback
									},
									"metadata" : {}
								});
							});
						}
					}
				}
			}
		}); 
	}
	
	/**
	 * sets the solution for the current cell to be the solution for all cells in the notebook
	 */
	var allOutputsButton = function() {
		var myFunc = function () {
			cells = Jupyter.notebook.get_cells();
			for(i=0;i < cells.length;i++) {
				if(cells[i].cell_type == "code") {
					if(cells[i].output_area != undefined) {
						if(cells[i].output_area.outputs.length > 0) {
							if(cells[i].output_area.outputs[0].output_type == "execute_result") {
								cells[i].metadata.ordo_solution = cells[i].output_area.outputs[0].data
								console.log("updated metadata");
							}
						}
					}
				}
			}
		};
		var action = {
			icon: 'fa-lightbulb-o',
			help: 'Make all outputs solutions',
			help_index: 'zz',
			handler: myFunc
		};
		var prefix = 'allOutputsButton';
		var action_name = 'show-button';
		var full_action_name = Jupyter.actions.register(action, action_name,prefix);
		if($("[data-jupyter-action*='allOutputsButton']").length == 0) {
			Jupyter.toolbar.add_buttons_group([full_action_name]);
		}
	}

	/**
	 * toggles the cell mode between editing/creating solutions and giving feedback
	 */
	var ordoEditFeedbackToggle = function() {
		var editMode = function() {
			$('.command_mode').removeClass('ordo_feedback_mode');
			$('.command_mode').addClass('ordo_edit_mode');
			$("[data-jupyter-action*='feedbackToggle']").removeClass('active');
			$("[data-jupyter-action*='editModeToggle']").addClass('active');
			makeOutputButton();
			allOutputsButton();
		};
		var eMaction = {
			icon: 'fa-pencil',
			help: 'Enter ordo-edit mode',
			help_index: 'zy',
			handler: editMode
		};
		var eMprefix = 'editModeToggle';
		var eMaction_name = 'EnterEditMode';
		var eM_action_name = Jupyter.actions.register(eMaction, eMaction_name, eMprefix);

		var feedbackMode = function() {
			$('.command_mode').removeClass('ordo_edit_mode');
			$('.command_mode').addClass('ordo_feedback_mode');
			$("[data-jupyter-action*='editModeToggle']").removeClass('active');
			$("[data-jupyter-action*='feedbackToggle']").addClass('active');
			$("[data-jupyter-action*='allOutputsButton']").remove();
			$(".make-ordo-solution").remove();
			$(".ordo-user-input").remove();
		};
		var fMaction = {
			icon: 'fa-check',
			help: 'Enter feedback-only mode',
			help_index: 'zx',
			handler: feedbackMode
		};
		var fMprefix = 'feedbackToggle';
		var fMaction_name = 'EnterFeedbackMode';
		var fM_action_name = Jupyter.actions.register(fMaction, fMaction_name, fMprefix);
		Jupyter.toolbar.add_buttons_group([fM_action_name,eM_action_name])
		$('.command_mode').addClass('ordo_feedback_mode');
		$("[data-jupyter-action*='feedbackToggle']").addClass('active');
	}

	/**
	 * creates the buttons and handles the functionality related to editing a solution
	 */
	var editMetadataButtons = function() {
		var currCell = undefined;
		events.on('select.Cell', function(event, data) {
			newCell = data.cell;
			if(newCell == currCell){
				return;
			} else if($('.ordo_edit_mode').length == 0) {
				return;
			} else {
				$(".ordo-user-input").remove();
				currCell = newCell;
				if(currCell.cell_type == "code") {
					$(".selected > .output_wrapper .output").append(ordoEditButtons);
					$(".ordo-add-solution").on('click', function(event) {
						dialog.modal({
							'title': 'Add Solution',
							'body': makeSolutionInputArea(),
							'buttons': {
								'Cancel': {},
								'Save New Solution': {
									'id': 'save-solution-btn',
									'class': 'btn-primary',
									'click': function() {
										sol = {}
										sol[$('#output_type').val()] = $('#solution_text_area').val()
										Jupyter.notebook.get_selected_cell().metadata.ordo_solution = sol
									}
								},
							},
							'keyboard_manager': Jupyter.notebook.keyboard_manager,
							'notebook': Jupyter.notebook
						})
					});
					$(".ordo-add-success-msg").on('click', function(event) {
						dialog.modal({
							'title': 'Add Success Message',
							'body': makeMessageInputArea(),
							'buttons': {
								'Cancel': {},
								'Save New Message': {
									'id': 'save-success-msg-btn',
									'class': 'btn-primary',
									'click': function() {
										if($('#styling').val() == "bold") {
											sol = "<b>" + $('#message_text_area').val() + "</b>"
										} else {
											sol = $('#message_text_area').val() 
										}
										Jupyter.notebook.get_selected_cell().metadata.ordo_success = sol
									}
								},
							},
							'keyboard_manager': Jupyter.notebook.keyboard_manager,
							'notebook': Jupyter.notebook
						})
					});
					$(".ordo-add-failure-msg").on('click', function(event) {
						dialog.modal({
							'title': 'Add Failure Message',
							'body': makeMessageInputArea(),
							'buttons': {
								'Cancel': {},
								'Save New Message': {
									'id': 'save-failure-msg-btn',
									'class': 'btn-primary',
									'click': function() {
										if($('#styling').val() == "bold") {
											sol = "<b>" + $('#message_text_area').val() + "</b>"
										} else {
											sol = $('#message_text_area').val() 
										}
										Jupyter.notebook.get_selected_cell().metadata.ordo_failure = sol
									}
								},
							},
							'keyboard_manager': Jupyter.notebook.keyboard_manager,
							'notebook': Jupyter.notebook
						})
					});
				}
			}
		}); 
	}

	/**
	 * html for the feedback buttons on a cell
	 */
	var ordoEditButtons = 
			"<div class='btn-group col-md-offset-1 ordo-user-input' role='group' aria-label='author input values'>" +
			"<button type='button' title='add solution' class='btn btn-default fa fa-plus ordo-add-solution' data-field='ordo_solution'> Solution </button>" +
			"<button type='button' title='add success message' class='btn btn-success fa fa-thumbs-o-up ordo-add-success-msg' data-field='ordo_success'> Message </button>" +
			"<button type='button' title='add failure message' class='btn btn-danger fa fa-thumbs-down ordo-add-failure-msg' data-field='ordo_failure'> Message </button>" +
		"</div>";
	
	/**
	 * html for the input box to create a feedback message
	 */
	var makeMessageInputArea = function() {
		var styles= [
			'bold',
			'plain text',
			'html'
		]
		
		$sel = $('<select />', {
			'class': "form-control",
			'id': "styling",
			'title': 'Select the styling for the following text'
		})
		$.each(styles, function(index, type) {
			$sel.append("<option>" + type + "</option>")
		})

		var inputArea = $('<div />', {
			'class': 'inputArea'
		}).append(
			$('<div />', {
				'title': 'Message Input Area'
			}).append(
				$('<form />', {
					'class': "form-inline"
				}).append($sel)
					.append(
						$('<textarea />', {
							'class': 'form-control',
							'id': 'message_text_area',
							'rows': '2',
							'style': 'width:70%',
							'title': 'Input text here!'
						}))
						.append(
							$('<button />', {
								'class': 'btn btn-default add-field',
								'title': 'Add another field'
							}).append(
								$('<span />', {
									'class': 'fa fa-plus'
								})
							)
						)
					.append($('<p />', {
						'class': 'form-text text-muted',
						'text': 'When html is selected, users may format their message using html as desired.'
					}))
				)
			) 
		return inputArea;
	}

	/**
	 * html for the input form to create a solution
	 */
	var makeSolutionInputArea = function() {
		var output_types = [
			'text/plain',
			'text/html',
			'text/markdown',
			'text/latex',
			'image/svg+xml',
			'image/png',
			'image/jpeg',
			'application/javascript',
			'application/pdf'
		]
		
		$sel = $('<select />', {
			'class': "form-control solution_type",
			'id': "output_type",
			'title': 'Select the output type'
		})
		$.each(output_types, function(index, type) {
			$sel.append("<option>" + type + "</option>")
		})

		var inputArea = $('<div />', {
			'title': 'Solution Input Area'
		}).append(
			$('<form />', {
				'class': "form-inline"
			}).append($sel).append(
				$('<textarea />', {
					'class': 'form-control solution_text_area',
					'id': 'solution_text_area',
					'rows': '2',
					'style': 'width:65%',
					'title': 'Input text here!'
				})).append(
				$('<button />', {
					'class': 'btn btn-default',
					'title': 'Add another field'
				}).append(
					$('<span />', {
						'class': 'fa fa-plus'
					})
				)
			)
		)

		return inputArea;
	}

	var ordo_exts = function() {
		readConfig();
		ordoFeedback();
		makeOutputButton();
		showSolutionButton();
		editMetadataButtons();
		ordoEditFeedbackToggle();
	}
	return {
		load_ipython_extension: ordo_exts
	}
});
