define(['base/js/namespace', 'base/js/events'], function(Jupyter, events) {
	console.log("...Ordo loaded... grading capabilities initiated");
  return {
    load_ipython_extension: function () {
      events.on('output_appended.OutputArea', function(event,type,result,md,html) {
        cell = Jupyter.notebook.get_selected_cell();
        solution = cell.metadata.ordo_solution;
        if (solution != undefined) {
          if (html[0].outerHTML.indexOf("ordo_feedback") == -1) {
            if (solution == result) {
              if (cell.metadata.ordo_success == undefined) {
                feedback = "<p class='ordo_feedback' style='color:green'><b>Correct!</b></p>"
              } else {
                feedback = "<p class='ordo_feedback' style='color:green'><b>" + cell.metadata.ordo_success + "</b></p>"
              }
            } else {
              if (cell.metadata.ordo_failure == undefined) {
                feedback = "<p class='ordo_feedback' style='color:red'><b>Incorrect.</b></p>"
              } else {
                feedback = "<p class='ordo_feedback' style='color:red'><b>" + cell.metadata.ordo_failure + "</b></p>"
              }
            }
            cell.output_area.append_output({
              "output_type" : "display_data",
              "data" : {
                "text/html": feedback
              },
              "metadata" : {}
            });
          }
        }
      });
    }
  }
});