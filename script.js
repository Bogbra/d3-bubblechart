// Layout und Skalen definieren
const width = 1000, height = 600, margin = {top: 40, right: 40, bottom: 80, left: 80};

const svg = d3.select("#chartArea").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Slider Farbverlauf
const slider = document.getElementById("yearSlider");

function updateTrackColor(slider) {
  const min = slider.min;
  const max = slider.max;
  const val = slider.value;
  const percent = ((val - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, #91c3bf 0%, #91c3bf ${percent}%, #d1d1d1 ${percent}%, #d1d1d1 100%)`;
}

slider.addEventListener("input", () => updateTrackColor(slider));
updateTrackColor(slider);

// Skalen für Achsen, Bubble-Größe und Farbe
const xScale = d3.scaleLinear().range([0, innerWidth]);
const yScale = d3.scaleLinear().range([innerHeight, 0]);
const rScale = d3.scaleSqrt().range([2, 40]);
const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

const tooltip = d3.select("#tooltip");
let dataByYear = {}; // Objekt, das die Daten nach Jahr speichert

// CSV laden
d3.csv("bubble_data.csv").then(data => {
    // Daten strukturieren
    data.forEach(d => {
        d.year = +d.year;
        d.gni_per_capita = +d.gni_per_capita;
        d.life_expectancy = +d.life_expectancy;
        d.population = +d.population;

        if (!dataByYear[d.year]) dataByYear[d.year] = [];
        dataByYear[d.year].push(d);
    });

    // Domains der Skalen setzen
    xScale.domain([0, d3.max(data, d => d.gni_per_capita)]);
    yScale.domain([50, d3.max(data, d => d.life_expectancy)]);
    rScale.domain([0, d3.max(data, d => d.population)]);

    // Achsen
    svg.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .attr("class", "y-axis axis")
        .call(d3.axisLeft(yScale));

    // Rasterlinien
    svg.selectAll(".x-grid")
        .data(xScale.ticks(10))
        .enter()
        .append("line")
        .attr("class", "x-grid")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#d1d1d1")
        .attr("stroke-dasharray", "2,2");

    svg.selectAll(".y-grid")
        .data(yScale.ticks(10))
        .enter()
        .append("line")
        .attr("class", "y-grid")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "#d1d1d1")
        .attr("stroke-dasharray", "2,2");

    // Achsenbeschriftung
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .text("Einkommen pro Kopf");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", - 50)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .text("Lebenserwartung");

    // Länder-Checkboxen generieren
    const allCountries = Array.from(new Set(data.map(d => d.country)));
    let selectedCountries = new Set(allCountries); // Zu Beginn: Alle Länder anzeigen
    
    const countryFilter = d3.select("#countryFilter");

    allCountries.forEach(country => {
        countryFilter.append("label")
            .html(`<input type="checkbox" checked value="${country}"> ${country}`);
    });

    // Checkbox-Verhalten: Länder ein-/ausblenden
    countryFilter.selectAll("input").on("change", function() {
        const checked = d3.select(this).property("checked");
        const value = d3.select(this).property("value");

        if (checked) {
            selectedCountries.add(value);
        } else {
            selectedCountries.delete(value);
        }

        update(+document.getElementById("yearSlider").value);
    });

    // Initiales Rendering + Slider-Interaktion
    update(+document.getElementById("yearSlider").value);

    d3.select("#yearSlider").on("input", function () {
        const year = +this.value;
        d3.select("#yearLabel").text(year);
        update(year);
    });

    // Update Funktion
    function update(year) {
        // Jahr als Zahl im Hintergrund anzeigen
        let yearText = svg.selectAll(".year-text").data([year]);

        yearText.enter()
            .append("text")
            .attr("class", "year-text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight / 2 + 100)
            .attr("text-anchor", "middle")
            .style("font-size", "240px")
            .style("fill", "gainsboro")
            .style("opacity", 0.3)
            .merge(yearText)
            .text(year);

        yearText.exit().remove();

        // Gefilterte Daten für das aktuelle Jahr
        const yearData = (dataByYear[year] || []).filter(d => selectedCountries.has(d.country));

        // Bubbles zeichnen
        const circles = svg.selectAll("circle").data(yearData, d => d.country);

        // neue Kreise hinzufügen
        circles.enter()
            .append("circle")
            .attr("class", "bubble")
            .attr("cx", d => xScale(d.gni_per_capita))
            .attr("cy", d => yScale(d.life_expectancy))
            .attr("r", 0)
            .style("fill", d => colorScale(d.country))
            .on("mouseover", function (event, d) {
                tooltip.style("visibility", "visible")
                    .html(`<h3>${d.country}</h3> GNI: $${d.gni_per_capita}<br> Life Expectancy: ${d.life_expectancy}<br> Population: ${d.population}`);
            })
            .on("mousemove", function (event) {
                tooltip.style("top", (event.pageY + 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", () => tooltip.style("visibility", "hidden"))
            .merge(circles)
            .transition()
            .duration(1000)
            .ease(d3.easeCubicInOut)
            .attr("cx", d => xScale(d.gni_per_capita))
            .attr("cy", d => yScale(d.life_expectancy))
            .attr("r", d => rScale(d.population));

        // alte Kreise entfernen
        circles.exit()
            .transition()
            .duration(500)
            .attr("r", 0)
            .remove();
    }
});

