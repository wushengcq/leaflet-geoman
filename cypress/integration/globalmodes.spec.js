describe('Modes', () => {
  const mapSelector = '#map';
  it('limits markers in edit mode', () => {

    cy.drawShape('MonsterPolygon');

    cy.window().then(({ map }) => {
      map.pm.setGlobalOptions({
        limitMarkersToCount: -1
      })
    })


    cy.toolbarButton('edit').click();
    cy.hasVertexMarkers(2487);


    cy.toolbarButton('edit').click();


    cy.window().then(({ map }) => {
      map.pm.setGlobalOptions({
        limitMarkersToCount: 20
      })
    })


    cy.toolbarButton('edit').click();
    cy.hasTotalVertexMarkers(20);

  });

  it('properly changes markers on vertex removal', () => {
    cy.drawShape('PolygonPart1');

    cy.window().then(({ map }) => {
      map.pm.setGlobalOptions({
        limitMarkersToCount: 3,
        limitMarkersToViewport: true,
      })
    })

    cy.toolbarButton('edit').click();

    cy.hasTotalVertexMarkers(3);

    cy.get('.marker-icon:not(.marker-icon-middle)')
      .first()
      .trigger('contextmenu');

    cy.hasTotalVertexMarkers(3);
  })

  it('respect limits when adding layers mid-edit', () => {
    cy.drawShape('PolygonPart1');

    cy.window().then(({ map }) => {
      map.pm.setGlobalOptions({
        limitMarkersToCount: 3,
        limitMarkersToViewport: true,
      })
    })

    cy.toolbarButton('edit').click();

    cy.hasTotalVertexMarkers(3);

    cy.drawShape('PolygonPart2');

    cy.hasTotalVertexMarkers(6);
  })

  it('properly removes layers', () => {
    cy.toolbarButton('marker').click();

    cy.get(mapSelector)
      .click(90, 250)
      .click(120, 250);

    cy.toolbarButton('delete').click();

    cy.hasLayers(3);

    cy.get(mapSelector)
      .click(90, 245)
      .click(120, 245);

    cy.hasLayers(1);

    cy.toolbarButton('delete').click();
  });

  it('unable to remove layer with pmIgnore:true', () => {
    cy.window().then(({ L, map }) => {
      const testLayer = new L.FeatureGroup();
      map.addLayer(testLayer);

      Cypress.$(map).on('pm:create', ({ originalEvent: event }) => {
        const poly = event.layer;

        const coords = poly.getLatLngs();

        const newPoly = L.polygon(coords, { pmIgnore: true }).addTo(testLayer);
        poly.remove();

        return newPoly;
      });
    });

    cy.toolbarButton('polygon').click();

    cy.get(mapSelector)
      .click(320, 150)
      .click(320, 100)
      .click(400, 100)
      .click(400, 200)
      .click(320, 150);

    cy.toolbarButton('delete').click();
    cy.get(mapSelector).click(330, 130);

    cy.window().then(({ L, map }) => {
      const layers = map._layers;

      expect(
        Object.entries(layers).filter(l => l[1] instanceof L.Polygon).length
      ).to.equal(1);
    });
  });

  it('drag mode enables drag for all layers', () => {
    cy.toolbarButton('marker').click();

    cy.get(mapSelector)
      .click(90, 250)
      .click(120, 250);

    cy.toolbarButton('drag').click();

    cy.window().then(({ map, L }) => {

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          assert.isTrue(layer.dragging._enabled)
        }
      })
    });
  });

  it('drag mode properly disables layers in edit mode', () => {
    // activate polygon drawing
    cy.toolbarButton('polygon')
      .click();

    // draw a polygon - triggers the event pm:create
    cy.get(mapSelector)
      .click(90, 250)
      .click(100, 50)
      .click(150, 50)
      .click(150, 150)
      .click(90, 250);

    cy.window().then(({ map, L }) => {
      map.eachLayer((l) => {
        if (l instanceof L.Polygon) {
          l.pm.enable()
        }
      })

      map.pm.enableGlobalDragMode();

      cy.hasVertexMarkers(0);

    });
  });

  it('reenables drag mode with acceptable performance', () => {


    cy.toolbarButton('circle-marker').click()
    cy.get(mapSelector).click(150, 250)
    cy.toolbarButton('drag').click()

    cy.testLayerAdditionPerformance();
  });

  it('re-applies edit mode onAdd', () => {
    cy.toolbarButton('polygon').click();

    const jsonString =
      '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-0.155182,51.515687],[-0.155182,51.521028],[-0.124283,51.521028],[-0.124283,51.510345],[-0.155182,51.515687]]]}}';

    const poly = JSON.parse(jsonString);

    cy.get(mapSelector)
      .click(320, 150)
      .click(320, 100)
      .click(400, 100)
      .click(400, 200)
      .click(320, 150);

    cy.toolbarButton('edit').click();
    cy.hasVertexMarkers(4);

    cy.window().then(({ map, L }) => {
      L.geoJSON(poly).addTo(map);
    });

    cy.hasVertexMarkers(8);

    cy.toolbarButton('edit').click();
  });

  it.only('properly re-enables edit mode for layers to layergroup', () => {
    cy.drawShape('PolygonPart1');

    cy.toolbarButton('edit').click();

    cy.fixture('PolygonPart2').as('poly1');
    cy.fixture('PolygonPart3').as('poly2');

    cy.get('@poly1').then(poly1 => {
      cy.get('@poly2').then(poly2 => {
        cy.window().then(({ map, L }) => {
          const group = L.layerGroup().addTo(map);

          L.geoJson(poly1).addTo(group);
          L.geoJson(poly2).addTo(group);
        })
      });
    });



    cy.hasTotalVertexMarkers(150);
  })

  it('reenables edit mode with acceptable performance', () => {

    cy.toolbarButton('circle-marker').click()
    cy.get(mapSelector).click(150, 250)
    cy.toolbarButton('edit').click()

    cy.window().then(({ map, L }) => {
      map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) {
          assert.isTrue(layer.pm.enabled())
        }
      })
    });

    cy.testLayerAdditionPerformance();
  });

  it('re-applies removal mode onAdd', () => {
    cy.toolbarButton('marker').click();

    cy.get(mapSelector)
      .click(90, 250)
      .click(120, 250);

    cy.toolbarButton('delete').click();

    cy.get(mapSelector).click(90, 248);

    cy.hasLayers(2);

    cy.window().then(({ map, L }) => {
      L.marker([51.505, -0.09]).addTo(map);
      L.marker([51.505, -0.08]).addTo(map);
    });

    cy.window().then(({ map, L }) => {
      map.eachLayer((l) => {
        if (l instanceof L.Marker) {
          cy.wrap(l._icon).click();
        }
      })
    });

    cy.hasLayers(1);

    cy.toolbarButton('marker').click();

    cy.get(mapSelector).click(90, 250);

    cy.toolbarButton('marker').click();

    cy.get(mapSelector).click(90, 245);

    cy.hasLayers(2);
  });

  it('reenables removal mode with acceptable performance', () => {

    cy.toolbarButton('circle-marker').click()
    cy.get(mapSelector).click(150, 250)
    cy.toolbarButton('delete').click()

    cy.testLayerAdditionPerformance();
  });
});
