Vue.config.devtools = true;

const title = "Results: ";


stageMaps = [

    {Stage: '_1', StageShow: '_', Colour:'_'},
    {Stage: '_2', StageShow: '_', Colour:'_'},
    {Stage: 'WAITING', StageShow: 'Waiting', Colour:'#FFFFA6'},
    {Stage: '_4', StageShow: '_', Colour:'_'},

    {Stage: 'EVALUATING', StageShow: 'Evaluating', Colour:' #9A9C34'},
    {Stage: '_6', StageShow: '_', Colour:'_'},
    {Stage: '_7', StageShow: '_', Colour:'_'},
    {Stage: 'NOT_TB', StageShow: 'Interrupted Evaluation', Colour:' #303030'},

    {Stage: 'TREATING', StageShow: 'Treating', Colour:' #4BB35D'},
    {Stage: '_14', StageShow: '_', Colour:'_'},
    {Stage: '_15', StageShow: '_', Colour:'_'},
    {Stage: '_16', StageShow: '_', Colour:'_'},

    {Stage: 'REEVALUATING', StageShow: 'Re-evaluating', Colour:' #532669'},
    {Stage: '_10', StageShow: '_', Colour:'_'},
    {Stage: '_11', StageShow: '_', Colour:'_'},
    {Stage: '_12', StageShow: '_', Colour:'_'},

    {Stage: 'DEAD', StageShow: 'Dead', Colour:' #000000'},
    {Stage: 'CENSORED', StageShow: 'Censored', Colour:' #001804'},
    {Stage: 'COMPLETED', StageShow: 'Completed', Colour:' #8EE09C'},
    {Stage: 'LOSS', StageShow:'Lost to follow-up', Colour:' #0F3115'},
];

stageOrder = ['WAITING', 'EVALUATING', 'NOT_TB', 'REEVALUATING',
              'TREATING', 'COMPLETED', 'CENSORED', 'LOSS', 'DEAD'];


const show = d3slideshow.create('#results', title)
    .layout('YXratio', 0.85)
    .layout('Prop', 0.3);


// const end = 3651;


d3.json("data/Pathways3.json", function(error, pathwaysAll) {
    const colors = d3.scaleOrdinal(d3.schemeCategory20c).domain(stageMaps.map(e=>e.Stage));
    const subSize = 100;
    // let fil = function(x) {return True};
console.log(pathwaysAll);
    let seqFreqAll = pathwaysAll.map(function(pathway, j) {
        const path = pathway.PathwaySimple, bg = pathway.Background;
        const t0 = path[0].Time;
        if (path.length === 1) {
            return {
                Background: bg,
                Pattern: path[0].Stage,
                SF: [{Stage: path[0].Stage, Time: path[0].Time, TimeS: 0, dt: 1}]
            };
        } else {
            return {
                Background: bg,
                Pattern: path.map(p => p.Stage).join(":"),
                SF: path.map((p, i) => {
                    let dt = (path[i+1])? (path[i+1].Time - p.Time):1;
                    return {Index: j, Stage: p.Stage, Time: p.Time, TimeS: p.Time-t0, dt: dt}
                })
            };
        }
    });


    let subSummary = d3.nest()
        .key(sf => sf.Pattern)
        .entries(seqFreqAll.filter((d, i) => i < subSize))
        .sort((a, b) => a.values.length - b.values.length);

    let y0 = 0;
    let sfBlocks = subSummary
        .map(kv => {
            return kv.values.map(sf => {
                sf.SF.forEach(s => s.y0=y0);
                y0 ++;
                return sf.SF;
            }).reduce((c, a) => c.concat(a), []);
        })
        .reduce((c, a) => c.concat(a), []);



    let seqFreqSummary = d3.nest()
        .key(sf => sf.Pattern)
        .entries(seqFreqAll)
        .sort((a, b) => a.values.length - b.values.length);


    y0 = 0;
    let sfsBlocks = seqFreqSummary
        .map(kv => {
            kv.values.forEach(sf => {
                sf.y0 = y0;
                y0 ++;
            });
            return kv;
        })
        .map(kv => {
            const size = kv.values[0].SF.length, n=kv.values.length;
            let sf = [], s_dt = 0, y0=kv.values[0].y0, x0=0;
            for (let i = 0; i < size; i++) {
                let sts = kv.values.map(v => v.SF[i]);
                let dt = d3.sum(sts.map(v => v.dt));

                sf.push({
                    Stage: sts[0].Stage,
                    dt: dt/n,
                    x0_e: x0/n,
                    dx_e: dt/n,
                    y0: y0,
                    dy: n
                });
                if (i < size - 1) {
                    s_dt += dt;
                }
                x0 += dt;
            }
            s_dt /= n;
            sf[sf.length-1].dx_e = 0.02 * s_dt;
            sf.forEach(s => s.dx_s = s.dx_e/s_dt);
            sf.forEach(s => s.x0_s = s.x0_e/s_dt);
            return sf;
        })
        .reduce((c, a) => c.concat(a), []);


    let stageDistAll = seqFreqAll
        .map(function(sfs, j) {
        let sd = [], y0 = 0, sf = sfs.SF, size = sf.length, bg = sfs.Background, p, stage;

        for (let i = 0; i < size; i++) {
            p = sf[i];
            stage = p.Stage;

            let t0 = p.TimeS, t1 = t0 + p.dt;
            if (t1 < y0+5) {
                continue;
            }

            while (y0 < t1) {
                if (y0 >= 365) {
                    break;
                }
                sd.push({
                    Index: j,
                    Stage: stage,
                    Time0: y0,
                    Time1: y0 + 5
                });
                y0 += 5;
            }
            if (y0 >= 365) {
                break;
            }
        }

        while (y0 < 365) {
            sd.push({
                Index: j,
                Stage: stage,
                Time0: y0,
                Time1: y0 + 5
            });
            y0 += 5;
        }

        return {
            Background: bg,
            SD: sd
        }

    });


    let sdBlocks = stageDistAll
        .filter((d, i) => i < subSize)
        .reduce((c, a) => c.concat(a.SD), []);


    d3.nest()
        .key(d => d.Time0)
        .entries(sdBlocks)
        .forEach(kv => {
            kv.values.sort((a, b) => {
                let ia = stageOrder.indexOf(a.Stage), ib = stageOrder.indexOf(b.Stage);
                if (ia < ib) return 1;
                if (ia > ib) return -1;
                return a.Index - b.Index;
            });

            kv.values.forEach((v, i) => v.Order = i);
        });

//    console.log(sdBlocks);

    let sdsBlocks = d3.range(0, 365, 5)
        .map((t, i) => {
            let sdb = d3.nest()
                .key(d => d.Stage)
                .entries(stageDistAll.map(sd => sd.SD[i]))
                .map(kv => {
                    return {Stage: kv.key, Size: kv.values.length, Time0: t, dt: 5};
                })
                .sort((a, b) => stageOrder.indexOf(b.Stage) - stageOrder.indexOf(a.Stage));

            let y0 = 0;
            sdb.forEach(sd => {
                sd.y0 = y0;
                y0 += sd.Size;
            });

            return sdb
        })
        .reduce((c, a) => c.concat(a), []);


    let statistics = pathwaysAll.filter((p, i) => i < 300).map((p, i) => {
        return {
            Index: i,
            Statistics: p.Statistics,
            Background: p.Background
        };
    });

    let incs = pathwaysAll
        .filter(d => d.Background.Income > 5000)
        .map(d => d.Background.Income);

    let inc50 = d3.quantile(incs, 0.5);
    statistics.forEach(d => d.LowInc = d.Background.Income < inc50);
    console.log(statistics)

    // console.log(sdsBlocks);

    show.appendFigure("Pathways")
        .event("init", function() {
            this.elements.y = d3.scaleLinear()
                .domain([0, d3.max(sfBlocks, d => d.Index+1)])
                .range([0, this.height]);
            this.elements.x_start = d3.scaleLinear()
                .domain([0, d3.max(sfBlocks, d=> d.Time+d.dt)])
                .range([0, this.width]);
            this.elements.x_align = d3.scaleLinear()
                .domain([0, d3.max(sfBlocks, d=> d.TimeS+d.dt)])
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

            this.elements.blocks = this.g.selectAll(".blk").data(sfBlocks)
                .enter().append("rect").attr("class", "blk")
                .attr("x", d => this.elements.x_start(d.Time))
                .attr("width", d => this.elements.x_start(d.dt))
                .attr("y", d => this.elements.y(d.Index))
                .attr("height", this.elements.y(1.5))
                .style("fill", d => colors(d.Stage));

        })
        .event("start", function() {
            const t = d3.transition().duration(1200);

            this.elements.xAxisCall.scale(this.elements.x_start);
            this.g.select(".x")
                .transition(t)
                .call(this.elements.xAxisCall);

            this.elements.blocks.transition(t)
                .attr("x", d => this.elements.x_start(d.Time))
                .attr("width", d => this.elements.x_start(d.dt))
                .attr("y", d => this.elements.y(d.Index))
                .attr("height", this.elements.y(1.5))
                .style("fill", d => colors(d.Stage));
        })
        .event("align", function() {
            const t = d3.transition().duration(1200);

            this.elements.xAxisCall.scale(this.elements.x_align);
            this.g.select(".x")
                .transition(t)
                .call(this.elements.xAxisCall);


            this.elements.blocks.transition(t)
                .attr("x", d => this.elements.x_align(d.TimeS))
                .attr("width", d => this.elements.x_align(d.dt))
                .attr("y", d => this.elements.y(d.Index))
                .attr("height", this.elements.y(1.5))
                .style("fill", d => colors(d.Stage));
        })
        .event("group", function() {
            const t = d3.transition().duration(1200);

            this.elements.xAxisCall.scale(this.elements.x_align);
            this.g.select(".x")
                .transition(t)
                .call(this.elements.xAxisCall);


            this.elements.blocks.transition(t)
                .attr("x", d => this.elements.x_align(d.TimeS))
                .attr("width", d => this.elements.x_align(d.dt))
                .attr("y", d => this.elements.y(d.y0))
                .attr("height", this.elements.y(1.5))
                .style("fill", d => colors(d.Stage));
        })
        .event("cut", function() {
            const t = d3.transition().duration(1200);

            this.elements.xAxisCall.scale(this.elements.x_cut);
            this.g.select(".x")
                .transition(t)
                .call(this.elements.xAxisCall);


            this.elements.blocks.transition(t)
                .attr("x", d => this.elements.x_cut(d.TimeS))
                .attr("width", d => this.elements.x_cut(d.dt))
                .attr("y", d => this.elements.y(d.Index))
                .attr("height", this.elements.y(1.5))
                .style("fill", d => (d.TimeS <= 365)? colors(d.Stage): "#FFF");
        });


    show.appendFigure("SeqFreq")
        .event("init", function() {
            this.elements.y = d3.scaleLinear()
                .domain([0, d3.max(sfsBlocks, d => d.y0+d.dy)])
                .range([0, this.height]);
            this.elements.x_start = d3.scaleLinear()
                .domain([0, d3.max(sfsBlocks, d => d.x0_e+d.dx_e)])
                .range([0, this.width]);
            this.elements.x_standard = d3.scaleLinear()
                .domain([0, d3.max(sfsBlocks, d => d.x0_s+d.dx_s)])
                .range([0, this.width]);

            this.elements.xAxisCall = d3.axisBottom();

            this.elements.xAxisCall.scale(this.elements.x_start);

            this.g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate("+[0, this.height]+")")
                .call(this.elements.xAxisCall);

            this.elements.blocks = this.g.selectAll(".blk").data(sfsBlocks)
                .enter().append("rect").attr("class", "blk")
                .attr("x", d => this.elements.x_start(d.x0_e))
                .attr("width", d => this.elements.x_start(d.dx_e))
                .attr("y", d => this.elements.y(d.y0))
                .attr("height", d => this.elements.y(d.dy))
                .style("fill", d => colors(d.Stage));

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
                .attr("x", d => this.elements.x_standard(d.x0_s))
                .attr("width", d => this.elements.x_standard(d.dx_s));
        });


    show.appendFigure("PathwayFrags")
        .event("init", function() {
            this.elements.y = d3.scaleLinear()
                .domain([0, d3.max(sdBlocks, d => d.Index+1)])
                .range([0, this.height]);
            this.elements.x = d3.scaleLinear()
                .domain([0, d3.max(sdBlocks, d => d.Time0) + 5])
                .range([0, this.width]);

            this.elements.xAxisCall = d3.axisBottom();

            this.elements.xAxisCall.scale(this.elements.x);

            this.g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate("+[0, this.height]+")")
                .call(this.elements.xAxisCall);

            this.elements.blocks = this.g.selectAll(".blk").data(sdBlocks)
                .enter().append("rect").attr("class", "blk")
                .attr("x", d => this.elements.x(d.Time0))
                .attr("width", this.elements.x(5))
                .attr("y", d => this.elements.y(d.Index))
                .attr("height", this.elements.y(1.2))
                .style("fill", d => colors(d.Stage));

        })
        .event("start", function() {
            this.elements.blocks.transition().duration(1200)
                .attr("y", d => this.elements.y(d.Index))
                .attr("height", this.elements.y(1.5));
        })
        .event("sort", function() {
            this.elements.blocks.transition().duration(1200)
                .attr("y", d => this.elements.y(d.Order))
                .attr("height", this.elements.y(1.5));
        });


    show.appendFigure("StageDist")
        .event("init", function() {
            this.elements.y = d3.scaleLinear()
                .domain([0, d3.max(sdsBlocks, d => d.y0 + d.Size)])
                .range([0, this.height]);
            this.elements.x = d3.scaleLinear()
                .domain([0, 365])
                .range([0, this.width]);

            this.elements.xAxisCall = d3.axisBottom();

            this.elements.xAxisCall.scale(this.elements.x);

            this.g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate("+[0, this.height]+")")
                .call(this.elements.xAxisCall);

            this.elements.blocks = this.g.selectAll(".blk").data(sdsBlocks)
                .enter().append("rect").attr("class", "blk")
                .attr("x", d => this.elements.x(d.Time0))
                .attr("width", this.elements.x(5))
                .attr("y", d => this.elements.y(d.y0))
                .attr("height", d => this.elements.y(d.Size))
                .style("fill", d => colors(d.Stage));

        })
        .event("start", function() {
            //this.elements.blocks.transition().duration(1200)
            //    .attr("y", d => this.elements.y(d.y0))
            //    .attr("height", d => this.elements.y(d.Size));
        });

    show.appendFigure("Lrz")
        .event("init", function () {
            statistics.forEach(d => d.Current = d.Statistics.Cost);

            this.elements.y = d3.scaleLinear()
                .domain([0, d3.quantile(statistics, 0.8, d => d.Current)])
                .range([this.height, 0]);

            this.elements.y_accu = d3.scaleLinear()
                .domain([0, d3.sum(statistics, d => d.Current)])
                .range([this.height, 0]);

            this.elements.x = d3.scaleLinear()
                .domain([0, statistics.length])
                .range([0, this.width]);

            this.elements.yAxisCall = d3.axisRight();

            this.elements.yAxisCall.scale(this.elements.y);

            this.g.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+[this.width, 0]+")")
                .call(this.elements.yAxisCall);

            this.elements.xAxisCall = d3.axisBottom();
            this.elements.xAxisCall.scale(this.elements.x);

            this.g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate("+[0, this.height]+")")
                .call(this.elements.xAxisCall);

            this.elements.points = this.g.selectAll(".pt").data(statistics)
                .enter().append("circle").attr("class", "pt")
                .attr("cx", (d, i) => this.elements.x(i))
                .attr("cy", d => this.elements.y(d.Current))
                .attr("r", this.elements.x(2))
                .attr("fill", d => (d.Background.Employment === 0)? "#ff1c19": "#19cbc2");
        })
        .event("start", function(sel, tr) {
            sel = sel|| "Cost";
            statistics.forEach(d => d.Current = d.Statistics[sel]);
            const t = tr || d3.transition().duration(200)
            this.elements.y
                .domain([0, d3.max(statistics, d => d.Current)]);

            this.elements.y_accu
                .domain([0, 100]);

            this.elements.points
                .attr("cy", d => this.elements.y(d.Current));

            this.elements.yAxisCall.scale(this.elements.y);
            this.g.select(".y")
                .transition(t)
                .call(this.elements.yAxisCall);
        })
        .event("sort", function(tr) {
            const t = tr || d3.transition().duration(1200)
            statistics.sort((a, b) => a.Current - b.Current);
            let accu = 0
            statistics.forEach(d => {
                accu += d.Current;
                d.Accu = accu;
            })

            statistics.forEach(d => {
                d.Accu = d.Accu * 100 / accu;
            })

            this.elements.yAxisCall.scale(this.elements.y);
            this.g.select(".y")
                .transition(t)
                .call(this.elements.yAxisCall);

            this.elements.points.data(statistics).transition(t)
                .attr("cx", (d, i) => this.elements.x(i))
                .attr("cy", d => this.elements.y(d.Current));
        })
        .event("draw", function(sel) {
            this.start();
            this.sort(d3.transition().duration(100));
            this.elements.points.transition().duration(1200)
                .attr("cx", (d, i) => this.elements.x(i))
                .attr("cy", d => this.elements.y_accu(d.Accu));

            this.elements.yAxisCall.scale(this.elements.y_accu);
            this.g.select(".y")
                .transition().duration(1200)
                .call(this.elements.yAxisCall);
        });

    show.appendFigure("wall")
        .event("init", function () {
            this.g.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("height", this.height)
                .attr("width", this.width)
                .attr("fill", "#7574a0");

            this.g.append("text")
                .attr("x", this.width/2)
                .attr("y", this.height/2)
                .attr("text-anchor", "middle")
                .style("font-size", "30px")
                .text("Chu-Chang, Ku");
        })
        .event("demo", function(bg, txt) {
            this.g.selectAll("rect").transition().duration(200).attr("fill", bg);
            this.g.selectAll("text").transition().duration(100).text(txt);
        });


    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Fetched Pathways')
        .text('Context', `
6496 patient pathways are captured from 2001 to 2010. 
(Simulated 100 pathways ->)
`)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "Pathways");

            fig.start();
        });

    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Fetched Pathways')
        .text('Context', `
- Complexity
- Heterogenity
`)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "Pathways");
            fig.align();
        });


    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Pattern?')
        .text('Context', `
Group the pathways by pattern
`)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "Pathways");
            fig.group();
        });

    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Sequence Frequency')
        .text('Context', `
Merge the pathways in each group
`)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "SeqFreq");
            fig.start();
        });

    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Sequence Frequency')
        .text('Context', `
Standardise by total duration

Heterogeneity

No waiting period
- Unempolyment
- Chronic lung diseases
- Male

No evaluating period
- TB-related history
- Male
- Subsidised low income households


`)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "SeqFreq");
            fig.standardise();
        });

    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Stage Distribution')
        .text('Context', `
Focus on the first year since first visit

`)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "Pathways");
            fig.cut();
        });


    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Stage Distribution')
        .text('Context', `
Slice every pathway by 5 days


`)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "PathwayFrags");
            fig.start();
        });

    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Stage Distribution')
        .text('Context', `
Sort it!!

`)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "PathwayFrags");
            fig.sort();
        });

    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Stage Distribution')
        .text('Context', `
Distribution of stages patients stayed.

Interrupted Evalution caused a long flat tail
- Old patients
- With chronic lung diseases 
- Subsidised low income households
- Without Diabetes (negative)


Delay to treatment
- Subsidised low income households
- Poor regions (negative)

`)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "StageDist");
            fig.start();
        });


    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Who paid? Who cost?')
        .text('Context', `
Cost distribution
        `)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "Lrz");
            fig.start("Cost");
        });

    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Who paid? Who cost?')
        .text('Context', `
Sort the costs from low to high.
        `)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "Lrz");
            fig.sort();
        });

    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Who cost?')
        .text('Context', `
Lorenz curve: a measure of equality.

Gini:
- Waiting: 70
- Evaluating: 72
- Treating: 74


|                   | 0-90% | 90-100% |
|-------------------|-------|---------|
| Income < 50%:     | 74%   | 86%     |
| Unempolyed:       | 56%   | 80%     |
            
        `)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "Lrz");
            fig.draw("Cost");
        });

    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Who paid?')
        .text('Context', `
Gini:
- Waiting: 68
- Evaluating: 77
- Treating: 86


|                   | 0-90% | 90-100% |
|-------------------|-------|---------|
| Income < 50%:     | 74%   | 86%     |
| Unempolyed:       | 57%   | 73%     |
        `)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "Lrz");
            fig.draw("Paid");
        });

    show.appendSlide()
        .text('Chapter', 'Results')
        .text('Section', 'Who used?')
        .text('Context', `
Gini:
- Waiting: 57
- Evaluating: 58
- Treating: 44


|                   | 0-90% | 90-100% |
|-------------------|-------|---------|
| Income < 50%:     | 74%   | 84%     |
| Unempolyed:       | 59%   | 55%     |
        `)
        .event("activate", function(figs) {
            fig = d3slideshow.highlight(figs, "Lrz");
            fig.draw("Paid");
        });

    show.appendSlide()
        .text('Chapter', 'Discussion')
        .text('Section', 'Treatment')
        .text('Context', `
Patient:
- Compliance
- Treatment outcome

Physician:
- Treatment strategy

Policy maker: 
- Controllable infectious period
        `)
        .event('activate', function(figs) {
            const fig = d3slideshow.highlight(figs, "wall", 200);
            fig.demo("#2acb63", "Treatment");
        });


    show.appendSlide()
        .text('Chapter', 'Discussion')
        .text('Section', 'Related diagnosis')
        .text('Context', `
Patient:
- Initialisation

Physician:
- Referral efficiency
- Early symptoms
     `  )
        .event('activate', function(figs) {
            const fig = d3slideshow.highlight(figs, "wall", 200);
            fig.demo("#19cbc2", "Related diagnosis");
        });



    show.appendSlide()
        .text('Chapter', 'Discussion')
        .text('Section', 'Evaluation')
        .text('Context', `
Patient:
- Commodities

Physician:
- Awareness
- Concerns

Policy maker:
- Alarm
- Resource allocation
        `)
        .event('activate', function(figs) {
            const fig = d3slideshow.highlight(figs, "wall", 200);
            fig.demo("#cb5127", "Evaluation");
        });



    show.appendSlide()
        .text('Chapter', 'Next step')
        .text('Section', '')
        .text('Context', `
- Simulation model
- Related policy
        `)
        .event('activate', function(figs) {
            const fig = d3slideshow.highlight(figs, "wall", 200);
            fig.demo("#f2f55b", "Next...");
        });


    show.appendSlide()
        .text('Chapter', 'End')
        .text('Section', '')
        .text('Context', `

        `)
        .event('activate', function(figs) {
            const fig = d3slideshow.highlight(figs, "wall", 200);
            fig.demo("#0e8884", "Q & A");
        });

    show.start();

    document.body.addEventListener('keydown', function (e) {
        let keyCode = e.key;
        if (keyCode === "ArrowDown" || keyCode === "PageDown") {
            let page = show.App.Page;
            let pos0 = show.App.SectionPositions[page], pos1 = show.App.SectionPositions[page+1];
            if (pos0 && pos1) {
                window.scrollTo(0, pos0 * 0.9 + pos1 * 0.1);
            }

        } else if (keyCode === "ArrowUp" || keyCode === "PageUp") {
            let page = show.App.Page;
            let pos0 = show.App.SectionPositions[page-2], pos1 = show.App.SectionPositions[page-1];
            if (pos0 && pos1) {
                window.scrollTo(0, pos0 * 0.9 + pos1 * 0.1);
            }

        }
    });

});
