define(['jquery', 'base/js/namespace', 'base/js/events'], function($, Jupyter, events) {
	console.log("...Ordo loaded... grading capabilities initiated");
	/* feedback
	 * 	Capture output_appended.OutputArea event for the result value
	 * 	Capture finished_execute.CodeCell event for the data value
	 * 	check for a solution in cell metadata
	 * 	if exists:
	 * 		check only one area appended (ends recursion)
	 * 		if true:
	 * 			check result against solution
	 * 			if result correct:
	 * 				append the success message
	 * 			if result incorrect:
	 * 				append the failure message
	 */
  var feedback = function () {
    events.on('output_appended.OutputArea', function(event,type,result,md,html) {
			events.on('finished_execute.CodeCell', function(evt, data){
        solution = data.cell.metadata.ordo_solution;
        if (solution != undefined) {
          if (html.parent().parent().children().toArray().length == 1) {
            if (solution == result) {
              if (data.cell.metadata.ordo_success == undefined) {
                feedback = "<p class='ordo_feedback' style='color:green'><b>Correct!</b></p>"
              } else {
                feedback = "<p class='ordo_feedback' style='color:green'><b>" + data.cell.metadata.ordo_success + "</b></p>"
              }
            } else {
              if (data.cell.metadata.ordo_failure == undefined) {
                feedback = "<p class='ordo_feedback' style='color:red'><b>Incorrect.</b></p>"
              } else {
                feedback = "<p class='ordo_feedback' style='color:red'><b>" + data.cell.metadata.ordo_failure + "</b></p>"
              }
            }
            data.cell.output_area.append_output({
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
	/* makeOutputButton
	 *	Capture select cell event for the cell data
	 *	check cell type is code
	 *	if true:
	 *		check output_area.outputs is non-empty
	 *		if true:
	 *			make ordo_solution = output_area.outputs[0]
	 *		if false:
	 *			execute cell
	 *			make ordo_solution = output_area.outputs[0]
	 */
	var makeOutputButton = function () {
		events.on('select.Cell', function(event, data) {
			if(data.cell.cell_type == "code") {
				if(data.cell.output_area.outputs.length != 0) {
					console.log("executed code cell");
					console.log(data);
				} else {
					console.log("unexecuted code cell");
					console.log(data);
				}
			} else {
				console.log(data.cell.cell_type);
				console.log(data);
			}
		});
	}
	var allOutputsButton = function () {
		var myFunc = function () {
			alert('I am going to make all outputs into solutions.');
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
		Jupyter.toolbar.add_buttons_group([full_action_name]);
	}
	return {
		load_ipython_extension: feedback,
		load_ipython_extension: makeOutputButton
	//load_ipython_extension: allOutputsButton
	}
});
