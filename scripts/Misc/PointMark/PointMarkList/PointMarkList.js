/**
 * Copyright (c) 2011-2014 by Andrew Mustun. All rights reserved.
 * 
 * This file is part of the QCAD project.
 *
 * QCAD is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * QCAD is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with QCAD.
 */

include("scripts/WidgetFactory.js");
include("../PointMarkDraw/PointMarkDraw.js");

function PointMarkList(guiAction) {
    Widgets.call(this, guiAction);
}

PointMarkList.prototype = new Widgets();
PointMarkList.includeBasePath = includeBasePath;

/**
 * Shows / hides the layer list.
 */
PointMarkList.prototype.beginEvent = function() {
    Widgets.prototype.beginEvent.call(this);

    var appWin = RMainWindowQt.getMainWindow();
    var dock = appWin.findChild("PointMarkDock");
    if (!QCoreApplication.arguments().contains("-no-show")) {
        dock.visible = !dock.visible;
    }
};

PointMarkList.prototype.finishEvent = function() {
    Widgets.prototype.finishEvent.call(this);

    var appWin = RMainWindowQt.getMainWindow();
    var dock = appWin.findChild("PointMarkDock");
    this.getGuiAction().setChecked(dock.visible);
};

PointMarkList.itemClicked = function(item, col) {
    var handle = item.data(0, Qt.UserRole);
    var di = EAction.getDocumentInterface();
    if (isNull(di)) {
        return;
    }

    // find block reference and bounding box:
    var doc = di.getDocument();
    var blockRef = doc.queryObjectByHandle(handle);
    if (!isBlockReferenceEntity(blockRef)) {
        return;
    }

    if (!blockRef.isSelected()) {
        di.selectEntity(blockRef.getId());
    }

    // if we are drawing marks, set current parent benchmark:
    if (PointMark.getBenchmarkHandle(blockRef)===handle) {
        PointMarkDraw.setBenchmark(handle);
    }

    // zoom to mark:
//    var box = blockRef.getBoundingBox();

//    // find attribute(s):
//    var attribIds = doc.queryChildEntities(blockRef.getId(), RS.EntityAttribute);
//    if (attribIds.length!==0) {
//        for (var i=0; i<attribIds.length; i++) {
//            var attribId = attribIds[i];
//            var attrib = doc.queryEntityDirect(attribId);
//            if (!isAttributeEntity(attrib)) {
//                continue;
//            }

//            box.growToInclude(attrib.getBoundingBox());
//        }
//    }

    var view = di.getLastKnownViewWithFocus();
    if (isNull(view)) {
        return;
    }

//    view.zoomTo(box, Math.min(view.getWidth(), view.getHeight())*0.4);

    // only pan to mark:
    view.centerToPoint(blockRef.getPosition());
};

PointMarkList.updateFromDocument = function(di) {

    var appWin = RMainWindowQt.getMainWindow();
    var dock = appWin.findChild("PointMarkDock");
    if (!dock.visible) {
        return;
    }

    var treeWidget = appWin.findChild("PointMarkTree");
    var currentItem = treeWidget.currentItem();

    var selectedHandle = PointMarkDraw.getBenchmark();

    if (!isNull(currentItem) && isNull(selectedHandle)) {
        selectedHandle = currentItem.data(0, Qt.UserRole);
    }

    treeWidget.clear();

    if (isNull(di)) {
        // no document open, abort.
        return;
    }

    var treeData = PointMark.getPointMarkTree(di.getDocument());
    var item;

    for (var i=0; i<treeData.length; i++) {
        var list = treeData[i];

        var rootItem = undefined;
        for (var k=0; k<list.length; k++) {
            item = new QTreeWidgetItem(
                [
                    list[k][0],
                    RUnit.doubleToString(list[k][1].x, 0.01),
                    RUnit.doubleToString(list[k][1].y, 0.01),
                    RUnit.doubleToString(list[k][1].z, 0.01),
                    list[k][2]
                ]
            );
            item.setData(0, Qt.UserRole, list[k][3]);
            item.setTextAlignment(1, Qt.AlignRight);
            item.setTextAlignment(2, Qt.AlignRight);
            item.setTextAlignment(3, Qt.AlignRight);

            if (k===0) {
                item.setIcon(0, new QIcon(PointMarkList.includeBasePath + "/Benchmark.svg"));
                treeWidget.addTopLevelItem(item);
                rootItem = item;
            }
            else {
                if (isNull(rootItem)) {
                    continue;
                }

                item.setIcon(0, new QIcon(PointMarkList.includeBasePath + "/Point.svg"));
                rootItem.setExpanded(true);
                rootItem.addChild(item);
                //rootItem.sortChildren(0, Qt.AscendingOrder);
            }

            if (list[k][3]===selectedHandle) {
                treeWidget.setCurrentItem(item);
            }
        }
    }

    //treeWidget.sortItems(0, Qt.AscendingOrder);
    for (var col=0; col<4; col++) {
        treeWidget.resizeColumnToContents(col);
    }
};

PointMarkList.updateFromTransaction = function(doc, transaction) {
    // TODO: find out if any marks were affected at all:
    PointMarkList.updateFromDocument(EAction.getDocumentInterface());
    return;

    /*

    if (isNull(doc) || isNull(transaction)) {
        return;
    }

    var appWin = RMainWindowQt.getMainWindow();
    var pointMarkTree = appWin.findChild("PointMarkTree");

    // find out what has changed:
    var objIds = transaction.getAffectedObjects();
    for (var i=0; i<objIds.length; i++) {
        var objId = objIds[i];
        var blockRef = doc.queryObjectDirect(objId);
        if (!isBlockReferenceEntity(blockRef)) {
            continue;
        }

        var handle = PointMark.getBenchmarkHandle(blockRef);
        if (handle===RObject.INVALID_HANDLE) {
            continue;
        }

        var label = PointMark.getMarkLabel(doc, objId);
        var pos = blockRef.getPosition();

        // block ref is a benchmark:
        if (handle===blockRef.getHandle()) {
            var item = new QTreeWidgetItem(
                [
                    label,
                    RUnit.doubleToString(pos.x, 2),
                    RUnit.doubleToString(pos.y, 2),
                    RUnit.doubleToString(pos.z, 2),
                    blockRef.getLayerName()
                ]
            );
            pointMarkTree.addTopLevelItem(item);
        }
        // block ref is a point mark:
        else {

        }
    }
    */
};

PointMarkList.setScale = function(str) {
    var f = parseFloat(str, 10);

    var di = EAction.getDocumentInterface();
    if (isNull(di)) {
        return;
    }
    var doc = di.getDocument();

    var op = new RAddObjectsOperation();
    var ids = PointMark.queryAllMarkIds(doc, 'a');
    for (var i=0; i<ids.length; i++) {
        var id = ids[i];

        var blockRef = doc.queryEntity(id);
        if (isNull(blockRef) || !isBlockReferenceEntity(blockRef)) {
            continue;
        }

        blockRef.setScaleFactors(new RVector(f,f,f));
        op.addObject(blockRef);
    }

    di.applyOperation(op);
};

PointMarkList.init = function(basePath) {
    if (!hasPlugin("DWG")) {
        return;
    }

    var appWin = RMainWindowQt.getMainWindow();

    var action = new RGuiAction(qsTr("&Show / Hide Point Mark List"), appWin);
    action.setRequiresDocument(false);
    action.setScriptFile(basePath + "/PointMarkList.js");
    action.setIcon(basePath + "/PointMarkList.svg");
    action.setDefaultShortcut(new QKeySequence("g,t"));
    action.setDefaultCommands(["gt"]);
    action.setSortOrder(10000);
    EAction.addGuiActionTo(action, PointMark, true, true, false);

    var formWidget = WidgetFactory.createWidget(basePath, "PointMarkList.ui");

    // set up tree widget:
    var pointMarkTree = formWidget.findChild("PointMarkTree");
    pointMarkTree.itemClicked.connect(PointMarkList, "itemClicked");
    pointMarkTree.header().resizeSection(0, 150);
    pointMarkTree.header().resizeSection(1, 80);
    pointMarkTree.header().resizeSection(2, 80);
    pointMarkTree.header().resizeSection(3, 80);

    var scaleCombo = formWidget.findChild("Scale");
    //scaleCombo["currentIndexChanged(QString)"].connect(PointMarkList, "setScale");
    scaleCombo["editTextChanged"].connect(PointMarkList, "setScale");

    // set up tool buttons:
    var widgets = getWidgets(formWidget);
    widgets["PointMarkDraw"].setDefaultAction(
            RGuiAction.getByScriptFile("scripts/Misc/PointMark/PointMarkDraw/PointMarkDraw.js"));
    widgets["PointMarkExport"].setDefaultAction(
            RGuiAction.getByScriptFile("scripts/Misc/PointMark/PointMarkExport/PointMarkExport.js"));

    // set up dock widget:
    var dock = new RDockWidget(qsTr("Point Mark List"), appWin);
    dock.objectName = "PointMarkDock";
    dock.setWidget(formWidget);
    appWin.addDockWidget(Qt.RightDockWidgetArea, dock);
    dock.shown.connect(function() {
        action.setChecked(true);
        PointMarkList.updateFromDocument(EAction.getDocumentInterface());
    });
    dock.hidden.connect(function() {
        action.setChecked(false);
    });
    dock.visible = false;

    // create a transaction listener to keep widget up to date:
    var tAdapter = new RTransactionListenerAdapter();
    appWin.addTransactionListener(tAdapter);
    tAdapter.transactionUpdated.connect(PointMarkList, "updateFromTransaction");

    // create a focus listener to keep widget up to date if document changes:
    var fAdapter = new RFocusListenerAdapter();
    appWin.addFocusListener(fAdapter);
    fAdapter.focusUpdated.connect(PointMarkList, "updateFromDocument");
};
