import { Component, OnInit, Inject, NgZone, PLATFORM_ID, AfterViewInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatSelectChange } from '@angular/material/select';
import { Observable } from 'rxjs';
import { IPoll, IPollData, IPollGroup } from 'src/app/interfaces/poll';
import { PollsService } from 'src/app/services/polls.service';

import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  polls$: Observable<IPollGroup[]> = new Observable<IPollGroup[]>();
  pollsList: IPollGroup[] = [];
  selectedPoll: IPoll = {} as IPoll;
  isLoading = false;

  private root!: am5.Root;
  private rootBarChart!: am5.Root;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private zone: NgZone,
    private pollService: PollsService
  ) {}

  browserOnly(f: () => void) {
    if (isPlatformBrowser(this.platformId)) {
      this.zone.runOutsideAngular(() => {
        f();
      });
    }
  }

  ngOnInit(): void {
    this.pollService.getAllPolls().subscribe((polls: IPollGroup[]) => {
      this.pollsList = polls;
    });
  }

  groupIdSelected(event: MatSelectChange): void {
    this.isLoading = true;
    this.pollService.getPollById(event.value).subscribe((poll: IPoll) => {
      this.selectedPoll = poll;
      this.isLoading = false;
      setTimeout(() => {
        this.generateChart(poll);
      }, 0);
    });
  }

  generateChart(chartData: IPoll): void {
    let data = [...chartData.questions];

    data.forEach((dataArray) => {
      const sorted = [...dataArray.data].sort((a, b) => {
        return a.count - b.count;
      });
      const seriesData = {
        ...dataArray,
        data: [...sorted],
      };

      seriesData.data.forEach((element) => {
        const percentage = Math.round((element.count / seriesData.total) * 100);
        element.percentage = percentage;
      });

      //console.log('seriesData', seriesData);

      this.browserOnly(() => {
        let root = am5.Root.new(`${seriesData.questionId}_1`);
        root.setThemes([am5themes_Animated.new(root)]);

        let chart = root.container.children.push(
          am5percent.PieChart.new(root, {
            radius: am5.percent(50),
            layout: root.horizontalLayout,
          })
        );

        let series = chart.series.push(
          am5percent.PieSeries.new(root, {
            name: 'Series',
            categoryField: 'result',
            valueField: 'count',
          })
        );

        series.labels.template.set('text', "{category}:\n[bold]{valuePercentTotal.formatNumber('0.00')}%[/] ({value})");
        series.labels.template.set('textAlign', 'left');

        series.data.setAll([...seriesData.data]);
        series.appear(500, 200);

        this.root = root;
      });

      // barChart
      this.browserOnly(() => {
        let root = am5.Root.new(`${seriesData.questionId}_2`);
        root.setThemes([am5themes_Animated.new(root)]);

        let barChart = root.container.children.push(
          am5xy.XYChart.new(root, {
            layout: root.horizontalLayout,
          })
        );

        barChart.zoomOutButton.set('forceHidden', true);

        let xAxis = barChart.xAxes.push(
          am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererX.new(root, {}),
            visible: false,
            calculateTotals: true,
            extraMax: 0.1,
          })
        );

        xAxis.get('renderer').grid.template.setAll({
          location: 0,
          strokeWidth: 0,
          visible: false,
        });

        let yAxis = barChart.yAxes.push(
          am5xy.CategoryAxis.new(root, {
            categoryField: 'result',
            renderer: am5xy.AxisRendererY.new(root, {
              inside: true,
            }),
          })
        );

        yAxis.get('renderer').grid.template.setAll({
          strokeWidth: 0,
          visible: false,
        });

        yAxis.get('renderer').labels.template.setAll({
          dx: -5,
          dy: -25,
          visible: true,
          position: 'absolute',
        });

        yAxis.data.setAll([...seriesData.data]);

        // let percentAxisRenderer = am5xy.AxisRendererY.new(root, { opposite: true });
        // let percentAxis = barChart.yAxes.push(
        //   am5xy.ValueAxis.new(root, {
        //     renderer: percentAxisRenderer,
        //     min: 0,
        //     max: 100,
        //     strictMinMax: true,
        //   })
        // );
        // percentAxisRenderer.grid.template.set('forceHidden', true);
        // percentAxis.set('numberFormat', "#'%");

        let barSeries = barChart.series.push(
          am5xy.ColumnSeries.new(root, {
            name: 'Series',
            xAxis: xAxis,
            yAxis: yAxis,
            valueXField: 'count',
            categoryYField: 'result',
            sequencedInterpolation: true,
            sequencedDelay: 100,
            tooltip: am5.Tooltip.new(root, {
              pointerOrientation: 'left',
              labelText: '{categoryY}: {count}',
              dx: 40,
            }),
          })
        );

        barSeries.columns.template.setAll({
          height: 25,
        });

        barChart.set(
          'cursor',
          am5xy.XYCursor.new(root, {
            behavior: 'none',
            xAxis: xAxis,
            yAxis: yAxis,
          })
        );

        barSeries.bullets.push(function () {
          return am5.Bullet.new(root, {
            locationX: 1,
            locationY: 0.5,
            sprite: am5.Label.new(root, {
              centerY: am5.p50,
              // text: '{valueX}',
              text: "[bold]{percentage.formatNumber('0')}%[/]",
              populateText: true,
            }),
          });
        });

        barSeries.columns.template.adapters.add('fill', function (fill, target) {
          return barChart.get('colors')?.getIndex(barSeries.columns.indexOf(target));
        });

        barSeries.columns.template.adapters.add('stroke', function (stroke, target) {
          return barChart.get('colors')?.getIndex(barSeries.columns.indexOf(target));
        });

        let cellSize = 60;
        barSeries.events.on('datavalidated', function (ev) {
          let series = ev.target;
          let chart = series.chart;
          let xAxis = barChart.xAxes.getIndex(0);

          // Calculate how we need to adjust chart height
          let chartHeight =
            series.data.length * cellSize +
            xAxis!.height() +
            chart!.get('paddingTop', 0) +
            chart!.get('paddingBottom', 0);

          // Set it on chart's container
          chart!.root.dom.style.height = chartHeight + 'px';
        });

        // barSeries.bullets.push(function () {
        //   return am5.Bullet.new(root, {
        //     locationX: 1,
        //     locationY: 0,
        //     sprite: am5.Label.new(root, {
        //       centerX: am5.p100,
        //       centerY: am5.p100,
        //       text: '{result}',
        //       fill: am5.color(0xffffff),
        //       populateText: true,
        //     }),
        //   });
        // });

        barSeries.data.setAll([...seriesData.data]);
        barSeries.appear();

        this.rootBarChart = root;
      });
    });
  }

  ngOnDestroy() {
    // Clean up chart when the component is removed
    this.browserOnly(() => {
      if (this.root) {
        this.root.dispose();
      }
      if (this.rootBarChart) {
        this.rootBarChart.dispose();
      }
    });
  }
}
