Vue.config.devtools = true;


const show = d3slideshow.create('#overview', "Visualise Pathways", "Slide");

function assignGroupHeight(blocks) {
    fb = d3.nest()
        .key(sf => sf.Pattern)
        .entries(blocks)
        .sort((a, b) => a.values.length - b.values.length)
        .reduce((a, v) => a.concat(v.values), [])
        .forEach((d, i) => d.Blocks.forEach(d => d.y0 = i));
}

function cutBlocks(blocks, stages, end) {
    end = end||365;
    stages = stages.map(st => st.Stage);

    blocks = blocks.map(blk => {
        blk = Object.assign({}, blk);
        blk.at = function (t) {
            let sel;
            for (let i = 0; i < this.Blocks.length; i++) {
                sel = this.Blocks[i];
                if (sel.t1 >= t && sel.t0 <= t) {
                    return sel;
                }
            }
            return sel;
        };
        blk.index = function () {
          return this.Blocks[0].Index;
        };
        return blk;
    });

    let sds = [], sd;

    for (let day = 0; day <= end; day += 5) {
        sd = blocks.map(blk => {
            let sel = blk.at(day);
            return {
                Stage: sel.Stage,
                Colour: sel.Colour,
                Index: sel.Index,
                T0: day, T1: day+5}
        });
        sd.sort((a, b)=> stages.indexOf(b.Stage) - stages.indexOf(a.Stage));
        sd.forEach((d, i) => d.Sort = i);
        sds = sds.concat(sd);
    }
    return sds;
}

show.appendFigure("Availability")
    .event("init", function () {
        this.g.append("image")
            .attr("xlink:href", "figures/ppa.png")
            .attr("height", this.height)
            .attr("width", this.width);
        });



d3.queue()
    // .defer(d3.json, "data/output/Pathways.json")
    // .defer(d3.json, "data/Input/Stages_TB.json")
    .defer(d3.json, "https://patientpathwayanalysis.github.io/IPPA-data/output/Pathways.json")
    .defer(d3.json, "https://patientpathwayanalysis.github.io/IPPA-data/Input/Stages_TB.json")
    .await(function(error, pathways, stage_maps) {
        console.log(stage_maps);
        console.log(pathways);
        // transform data
        const n_pathways = pathways.length;
        let blocks = vis.toBlocks(pathways, stage_maps);
        console.log(blocks);
        let flatten_blocks = blocks.map(b => b.Blocks).reduce((a, v) => a.concat(v), []);
        console.log(flatten_blocks);
        let pre = vis.filterPrePat(blocks);
        //let post = vis.filterPostPat(blocks);
        console.log(pre);
        //console.log(post);
        let patFreq = vis.toPatFreq(pre);
        assignGroupHeight(pre);
        //console.log(patFreq);
        let stDist = vis.toStageDist(blocks, stage_maps);
        //console.log(stDist);
        const cut_blocks = cutBlocks(blocks, stage_maps, 365);
        //console.log(cut_blocks);

        show.appendFigure("Pathways")
            .event("init", function() {
                this.elements.y = d3.scaleLinear()
                    .domain([0, pathways.length])
                    .range([0, this.height]);

                this.elements.x_start = d3.scaleLinear()
                    .domain([0, d3.max(flatten_blocks, d=> d.T0+d.dt)])
                    .range([0, this.width]);

                this.elements.x_align = d3.scaleLinear()
                    .domain([0, d3.max(flatten_blocks, d=> d.t0+d.dt)])
                    .range([0, this.width]);

                this.elements.x_group = d3.scaleLinear()
                    .domain([0, d3.max(patFreq, d => d.x0_e+d.dx_e)])
                    .range([0, this.width]);

                this.elements.x_cut = d3.scaleLinear()
                    .domain([0, 365])
                    .range([0, this.width]);


                this.elements.xAxisCall = d3.axisBottom();

                this.elements.xAxisCall.scale(this.elements.x_start);

                this.g.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate("+[0, this.height]+")")
                    .call(this.elements.xAxisCall);

                this.elements.tip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

                this.elements.blocks = this.g.selectAll(".blk").data(flatten_blocks)
                    .enter().append("rect").attr("class", "blk")
                    .attr("x", d => this.elements.x_start(d.T0))
                    .attr("width", d => this.elements.x_start(d.dt))
                    .attr("y", d => this.elements.y(d.Index-1))
                    .attr("height", this.elements.y(0.9))
                    .style("fill", d => d.Colour)
                    .on("mouseover", d => {
                        this.elements.tip.transition()
                            .duration(200)
                            .style("opacity", 1);
                        this.elements.tip.html(
                            `<b>Stage: </b>${d.Stage}<br>` +
                            `<b>Duration: </b>${d.dt}`)
                            .style("left", (d3.event.pageX) + "px")
                            .style("top", (d3.event.pageY - 40) + "px");
                    })
                    .on("mouseout", () => {
                        this.elements.tip.transition()
                            .duration(200)
                            .style("opacity", 0);
                    });

            })
            .event("start", function() {
                const t = d3.transition().duration(1200);

                this.elements.xAxisCall.scale(this.elements.x_start);
                this.g.select(".x")
                    .transition(t)
                    .call(this.elements.xAxisCall);

                this.elements.blocks.transition(t)
                    .attr("x", d => this.elements.x_start(d.T0))
                    .attr("width", d => this.elements.x_start(d.dt))
                    .attr("y", d => this.elements.y(d.Index-1))
                    .attr("height", this.elements.y(0.9))
                    .style("opacity", 1)
                    .style("fill", d => d.Colour);
            })
            .event("align", function() {
                const t = d3.transition().duration(1200);

                this.elements.xAxisCall.scale(this.elements.x_align);
                this.g.select(".x")
                    .transition(t)
                    .call(this.elements.xAxisCall);

                this.elements.blocks.transition(t)
                    .attr("x", d => this.elements.x_align(d.t0))
                    .attr("width", d => this.elements.x_align(d.dt))
                    .attr("y", d => this.elements.y(d.Index-1))
                    .attr("height", this.elements.y(0.9))
                    .style("opacity", 1)
                    .style("fill", d => d.Colour);
            })
            .event("group", function() {
                const t = d3.transition().duration(1200);

                this.elements.xAxisCall.scale(this.elements.x_group);
                this.g.select(".x")
                    .transition(t)
                    .call(this.elements.xAxisCall);

                this.elements.blocks.transition(t)
                    .attr("x", d => this.elements.x_group(d.t0))
                    .attr("width", d => this.elements.x_group(d.PostTre?1:d.dt))
                    .attr("y", d => this.elements.y(d.y0))
                    .attr("height", this.elements.y(0.9))
                    .style("opacity", d => d.PreTre?1:0)
                    .style("fill", d => d.Colour);
            })
            .event("cut", function() {
                const t = d3.transition().duration(1200);

                this.elements.xAxisCall.scale(this.elements.x_cut);
                this.g.select(".x")
                    .transition(t)
                    .call(this.elements.xAxisCall);

                this.elements.blocks.transition(t)
                    .attr("x", d => this.elements.x_cut(d.t0))
                    .attr("width", d => this.elements.x_cut(d.dt))
                    .attr("y", d => this.elements.y(d.Index))
                    .attr("height", this.elements.y(1))
                    .style("fill", d => (d.t0 <= 365)? d.Colour: "#FFF");
            });

        show.appendFigure("Frag")
            .event("init", function() {
                this.elements.y = d3.scaleLinear()
                    .domain([0, d3.max(cut_blocks, d => d.Index) + 1])
                    .range([0, this.height]);
                this.elements.x = d3.scaleLinear()
                    .domain([0, 365])
                    .range([0, this.width]);

                this.elements.xAxisCall = d3.axisBottom();

                this.elements.xAxisCall.scale(this.elements.x);

                this.elements.tip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

                this.g.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate("+[0, this.height]+")")
                    .call(this.elements.xAxisCall);

                this.elements.blocks = this.g.selectAll(".blk").data(cut_blocks)
                    .enter().append("rect").attr("class", "blk")
                    .attr("x", d => this.elements.x(d.T0))
                    .attr("width", this.elements.x(5))
                    .attr("y", d => this.elements.y(d.Index))
                    .attr("height", this.elements.y(1))
                    .style("fill", d => d.Colour)
                    .on("mouseover", d => {
                        this.elements.tip.transition()
                            .duration(200)
                            .style("opacity", .95);
                        this.elements.tip.html(`<b>Stage: </b>${d.Stage}`)
                            .style('left', `${d3.event.pageX}px`)
                            .style('top', `${(d3.event.pageY - 15)}px`);
                    })
                    .on("mouseout", () => {
                        this.elements.tip.transition()
                            .duration(200)
                            .style("opacity", 0);
                    });
            })
            .event("start", function() {
                const t = d3.transition().duration(1200);

                this.elements.blocks.transition(t)
                    .attr("y", d => this.elements.y(d.Index));
            })
            .event("sort", function() {
                const t = d3.transition().duration(1200);

                this.elements.blocks.transition(t)
                    .attr("y", d => this.elements.y(d.Sort));
            });


        show.appendFigure("PatFreq")
            .event("init", function() {
                this.elements.y = d3.scaleLinear()
                    .domain([0, d3.max(patFreq, d => d.y0+d.dy)])
                    .range([0, this.height]);
                this.elements.x_start = d3.scaleLinear()
                    .domain([0, d3.max(patFreq, d => d.x0_e+d.dx_e)])
                    .range([0, this.width]);
                this.elements.x_standard = d3.scaleLinear()
                    .domain([0, d3.max(patFreq, d => 100*(d.x0_s+d.dx_s))])
                    .range([0, this.width]);

                this.elements.xAxisCall = d3.axisBottom();

                this.elements.xAxisCall.scale(this.elements.x_start);

                this.elements.tip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

                this.g.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate("+[0, this.height]+")")
                    .call(this.elements.xAxisCall);

                this.elements.blocks = this.g.selectAll(".blk").data(patFreq)
                    .enter().append("rect").attr("class", "blk")
                    .attr("x", d => this.elements.x_start(d.x0_e))
                    .attr("width", d => this.elements.x_start(d.dx_e))
                    .attr("y", d => this.elements.y(d.y0))
                    .attr("height", d => this.elements.y(d.dy))
                    .style("fill", d => d.Colour)
                    .on("mouseover", d => {
                        this.elements.tip.transition()
                            .duration(200)
                            .style("opacity", .95);
                        this.elements.tip.html(
                            `<b>Stage: </b>${d.Stage}<br/>` +
                            `<b>Number: </b>${d.dy}<br/>` +
                            `<b>Duration: </b>${Math.round(d.dx_e)} days (${Math.round(d.dx_s * 100)}%)`)
                            .style('left', `${d3.event.pageX}px`)
                            .style('top', `${(d3.event.pageY - 60)}px`);
                    })
                    .on("mouseout", () => {
                    this.elements.tip.transition()
                            .duration(200)
                            .style("opacity", 0);
                    });
            })
            .event("start", function() {
                const t = d3.transition().duration(1200);

                this.elements.xAxisCall.scale(this.elements.x_start);
                this.g.select(".x")
                    .transition(t)
                    .call(this.elements.xAxisCall);

                this.elements.blocks.transition(t)
                    .attr("x", d => this.elements.x_start(d.x0_e))
                    .attr("width", d => this.elements.x_start(d.dx_e));
            })
            .event("standardise", function() {
                const t = d3.transition().duration(1200);

                this.elements.xAxisCall.scale(this.elements.x_standard);
                this.g.select(".x")
                    .transition(t)
                    .call(this.elements.xAxisCall);

                this.elements.blocks.transition(t)
                    .attr("x", d => this.elements.x_standard(100*d.x0_s))
                    .attr("width", d => this.elements.x_standard(100*d.dx_s));
            });


        show.appendFigure("StageDist")
            .event("init", function() {

                this.elements.y = d3.scaleLinear()
                    .domain([0, d3.max(stDist, d => d.y0 + d.dy)])
                    .range([0, this.height]);
                this.elements.x = d3.scaleLinear()
                    .domain([0, 365])
                    .range([0, this.width]);

                this.elements.xAxisCall = d3.axisBottom();

                this.elements.xAxisCall.scale(this.elements.x);

                this.elements.tip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

                this.g.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate("+[0, this.height]+")")
                    .call(this.elements.xAxisCall);

                this.elements.blocks = this.g.selectAll(".blk").data(stDist)
                    .enter().append("rect").attr("class", "blk")
                    .attr("x", d => this.elements.x(d.x0))
                    .attr("width", d => this.elements.x(d.dx))
                    .attr("y", d => this.elements.y(d.y0))
                    .attr("height", d => this.elements.y(d.dy))
                    .style("fill", d => d.Colour)
                    .on("mouseover", d => {
                        this.elements.tip.transition()
                            .duration(200)
                            .style("opacity", .95);
                        this.elements.tip.html(
                            `<b>Day: ${d.x0}-${d.x0+d.dx}<br/>` +
                            `<b>Stage: </b>${d.Stage}<br/>` +
                            `<b>Number: </b>${d.dy} (${Math.round(d.dy/n_pathways*100)}%)<br/>`
                            )
                            .style('left', `${d3.event.pageX}px`)
                            .style('top', `${(d3.event.pageY - 60)}px`);
                    })
                    .on("mouseout", () => {
                        this.elements.tip.transition()
                            .duration(200)
                            .style("opacity", 0);
                    });
            });


        show.appendSlide()
            .text('Chapter', 'Overview')
            .text('Section', 'Crude pathways')
            .text('Context', `
30 Simulated pathways are used to demonstrate the visualisation of individual patient pathway analysis. Each bar in the figure indicates a patient pathway. 

In the begin, all the pathways starts from different points. 
Different colours imply  different stages in patient pathways. 


    Since the individual patient pathways involve with personal information, the patient pathways in this demonstration were modified by re-sampling, shuffling, and random walking. The examples here are for demonstration only. Therefore, the individual information are not responsible to any reality. 
`)
            .event("activate", function(figs) {
                d3slideshow.hideAll(figs);
                let fig = d3slideshow.highlight(figs, "Pathways");
                fig.start();
            });

//         show.appendSlide()
//             .text('Chapter', 'Overview')
//             .text('Section', 'About availability')
//             .text('Context', `
//
// The figure is adapted from the [Patient Pathway Analysis]('https://academic.oup.com/jid/article/216/suppl_7/S679/4595554').
// It visualises the alignment of healthcare services and patient care-seeking.
// `)
//             .event("activate", function(figs) {
//                 d3slideshow.highlight(figs, "Ava", 500);
//
//         });

        show.appendSlide()
            .text('Chapter', 'Overview')
            .text('Section', 'Pattern Frequency')
            .text('Context', `
The figure visualises the pattern of pathways before disease confirmation.
Every pathways are expected to have *Waiting*, *Evaluating*, *Detecting*, and *Treating* stages. However, skipping some of them is possible.

Through this figure, you can find
- Complexity of the pathways 
- Heterogenity of the pathways
- Care-seeking usual versus clinic guideline
`)
            .event("activate", function(figs) {
                let fig = d3slideshow.highlight(figs, "PatFreq", 500);
                fig.standardise();
            });

        show.appendSlide()
            .text('Chapter', 'Overview')
            .text('Section', 'Stage Distribution')
            .text('Context', `
The figure visualises the pattern of pathways before disease confirmation.
Every pathways are expected to have *Waiting*, *Evaluating*, *Detecting*, and *Treating* stages. However, skipping some of them is possible.

Through this figure, you can find
- Complexity of the pathways 
- Heterogenity of the pathways
- Care-seeking usual versus clinic guideline
`)
            .event("activate", function(figs) {
                d3slideshow.highlight(figs, "StageDist", 500);
            });

        show.appendSlide()
            .text('Chapter', 'Pattern Frequency')
            .text('Section', 'Introduction')
            .text('Context', `

**x-axis**: proportion of duration between initial care-seeking and disease confirmation

**y-axis**: number of pathways in each pattern 
      

`)
            .event("activate", function(figs) {
                let fig = d3slideshow.highlight(figs, "PatFreq", 500);
                fig.standardise();
            });

        show.appendSlide()
            .text('Chapter', 'Pattern Frequency')
            .text('Section', 'Step 1. Align crude pathways')
            .text('Context', `

Starting with the crude pathways, we firstly align all the pathway to the same start time.

`)
            .event("activate", function(figs) {
                figs.PatFreq.start();
                let fig = d3slideshow.highlight(figs, "Pathways", 500);
                fig.align();
            });

        show.appendSlide()
            .text('Chapter', 'Pattern Frequency')
            .text('Section', 'Step 2. Group by pattern')
            .text('Context', `
Focusing on the pattern before confirmation (treatment start), remove all the stage after confirmation.
Group them by the sequence pattern.
`)
            .event("activate", function(figs) {
                d3slideshow.hideAll(figs);
                let fig = d3slideshow.highlight(figs, "Pathways", 500);
                fig.group();
            });

        show.appendSlide()
            .text('Chapter', 'Pattern Frequency')
            .text('Section', 'Step 3. Summarise durations')
            .text('Context', `
Within each pattern, take the average of duration of each stage.

In the current step, you can find the mean of system delays (from initial care seeking to treatment start) of each pattern.
`)
            .event("activate", function(figs) {
                d3slideshow.hideAll(figs);
                let fig = d3slideshow.highlight(figs, "PatFreq", 500);
                fig.start();
            });

        show.appendSlide()
            .text('Chapter', 'Pattern Frequency')
            .text('Section', 'Step 4. Standardise by the length of system delay')
            .text('Context', `
Finally, present the durations of stages in proportions.
`)
            .event("activate", function(figs) {
                let fig = d3slideshow.highlight(figs, "PatFreq", 500);
                fig.standardise();
            });

        show.appendSlide()
            .text('Chapter', 'Stage Distribution')
            .text('Section', 'Introduction')
            .text('Context', `
**x-axis**: day since initial care-seeking

**y-axis**: number of pathways in each pattern
`)
            .event("activate", function(figs) {
                d3slideshow.highlight(figs, "StageDist", 500);
            });

        show.appendSlide()
            .text('Chapter', 'Stage Distribution')
            .text('Section', 'Step 1. Frame crude pathways')
            .text('Context', `

Starting with the crude pathways again, align all the pathway to the same start time, and give an end time to frame the pathways.

`)
            .event("activate", function(figs) {
                let fig = d3slideshow.highlight(figs, "Pathways");
                fig.cut();
            });

        show.appendSlide()
            .text('Chapter', 'Stage Distribution')
            .text('Section', 'Step 2. Fragment pathways')
            .text('Context', `
Fragment all the pathways by a fix time step (5 days in the example). 

Every block indicate a stage count in a time step. 
`)
            .event("activate", function(figs) {
                let fig = d3slideshow.highlight(figs, "Frag");
                fig.start();
            });

        show.appendSlide()
            .text('Chapter', 'Stage Distribution')
            .text('Section', 'Step 3. Sort stages')
            .text('Context', `
For every time step, sort stage blocks by a given order. 

Blocks with the same stages will be grouped together.
`)
            .event("activate", function(figs) {
                let fig = d3slideshow.highlight(figs, "Frag");
                fig.sort();
            });

        show.appendSlide()
            .text('Chapter', 'Stage Distribution')
            .text('Section', 'Step 4. Merge blocks by time and stage')
            .text('Context', `
Last, merge blocks with the same stage into a single block and calculate the percentage.
`)
            .event("activate", function(figs) {
                d3slideshow.highlight(figs, "StageDist", 500);
            });

        show.start();

    });



