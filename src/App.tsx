import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Text, Transformer } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";

interface TextNode {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontColor: string;
  width?: number;
  height?: number;
  isEditing?: boolean;
}

const KonvaTextEditor: React.FC = () => {
  const [textNodes, setTextNodes] = useState<TextNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentFontSize, setCurrentFontSize] = useState(20);
  const [history, setHistory] = useState<TextNode[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    addTextNode();
  }, []);

  useEffect(() => {
    if (historyIndex === -1 || !isEqual(history[historyIndex], textNodes)) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(cloneDeep(textNodes));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [textNodes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === "z") {
          e.preventDefault();
          undo();
        } else if (e.key === "y") {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, historyIndex]);

  const isEqual = (a: TextNode[], b: TextNode[]) => {
    return JSON.stringify(a) === JSON.stringify(b);
  };

  const cloneDeep = (nodes: TextNode[]) => {
    return JSON.parse(JSON.stringify(nodes));
  };

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const node = stageRef.current.findOne(`#${selectedId}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }

    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      return;
    }

    if (e.target.name() === "text-node") {
      const id = e.target.id();
      setSelectedId(id);
      const node = textNodes.find((n) => n.id === id);
      if (node) {
        setCurrentColor(node.fontColor);
        setCurrentFontSize(node.fontSize);
      }
    } else {
      setSelectedId(null);
    }
  };

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const id = e.target.id();
    setTextNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === id ? { ...node, x: e.target.x(), y: e.target.y() } : node
      )
    );
    isDragging.current = false;
  };

  const handleTransform = (e: KonvaEventObject<Event> | any) => {
    const id = e.target.id();
    const node = textNodes.find((n) => n.id === id);
    if (!node) return;

    const scaleX = e.target.scaleX();
    const newFontSize = Math.max(5, node.fontSize * scaleX);

    if (selectedId === id) {
      setCurrentFontSize(newFontSize);
    }

    e.target.scaleX(1);
    e.target.scaleY(1);
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const id = e.target.id();
    const node = textNodes.find((n) => n.id === id);
    if (!node) return;

    setTextNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === id
          ? {
              ...node,
              x: e.target.x(),
              y: e.target.y(),
              fontSize: Math.max(5, node.fontSize * e.target.scaleX()),
              width: e.target.width() * e.target.scaleX(),
              height: e.target.height() * e.target.scaleY(),
            }
          : node
      )
    );

    e.target.scaleX(1);
    e.target.scaleY(1);
  };

  const handleTextDoubleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (isDragging.current) return;

    const id = e.target.id();
    const node = textNodes.find((n) => n.id === id);
    if (!node) return;

    setEditText(node.text);
    setSelectedId(id);
    setCurrentColor(node.fontColor);
    setCurrentFontSize(node.fontSize);

    setTextNodes((prevNodes) =>
      prevNodes.map((n) =>
        n.id === id ? { ...n, isEditing: true } : { ...n, isEditing: false }
      )
    );

    setTimeout(() => {
      if (textInputRef.current) {
        const stage = e.target.getStage();
        const position = e.target.absolutePosition();
        const scale = stage?.scaleX() || 1;

        textInputRef.current.style.position = "absolute";
        textInputRef.current.style.top = `${position.y}px`;
        textInputRef.current.style.left = `${position.x}px`;
        textInputRef.current.style.width = `${e.target.width() * scale}px`;
        textInputRef.current.style.height = `${e.target.height() * scale}px`;
        textInputRef.current.style.fontSize = `${node.fontSize * scale}px`;
        textInputRef.current.style.color = node.fontColor;
        textInputRef.current.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
        textInputRef.current.style.border = "1px dashed #999";
        textInputRef.current.style.padding = "2px";
        textInputRef.current.style.borderRadius = "3px";
        textInputRef.current.value = node.text;
        textInputRef.current.focus();
      }
    }, 0);
  };

  const handleInputBlur = () => {
    if (!selectedId) return;

    const updatedText = textInputRef.current?.value || editText;
    
    setTextNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === selectedId
          ? {
              ...node,
              text: updatedText,
              fontColor: currentColor,
              fontSize: currentFontSize,
              isEditing: false,
            }
          : node
      )
    );
    
    setEditText(updatedText);
  };

  const handleFontSizeChange = (size: number) => {
    setCurrentFontSize(size);

    if (selectedId) {
      const node = stageRef.current.findOne(`#${selectedId}`);
      if (node) {
        node.fontSize(size);
        node.getLayer().batchDraw();
      }

      setTextNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === selectedId ? { ...node, fontSize: size } : node
        )
      );

      if (
        textInputRef.current &&
        textNodes.find((n) => n.id === selectedId)?.isEditing
      ) {
        textInputRef.current.style.fontSize = `${size}px`;
      }
    }
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);

    if (selectedId) {
      const node = stageRef.current.findOne(`#${selectedId}`);
      if (node) {
        node.fill(color);
        node.getLayer().batchDraw();
      }

      setTextNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === selectedId ? { ...node, fontColor: color } : node
        )
      );

      if (
        textInputRef.current &&
        textNodes.find((n) => n.id === selectedId)?.isEditing
      ) {
        textInputRef.current.style.color = color;
      }
    }
  };

  const addTextNode = () => {
    const newTextNode: TextNode = {
      id: Date.now().toString(),
      x: 50,
      y: 50,
      text: "Double click to edit",
      fontSize: currentFontSize,
      fontColor: currentColor,
      isEditing: false,
    };
    setTextNodes((prevNodes) => [...prevNodes, newTextNode]);
    setSelectedId(newTextNode.id);
  };

  const exportAsImage = () => {
    if (!stageRef.current) return;

    const uri = stageRef.current.toDataURL({
      mimeType: "image/png",
      quality: 1,
    });

    const link = document.createElement("a");
    link.download = "konva-text-editor.png";
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setTextNodes(cloneDeep(history[newIndex]));
      setSelectedId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setTextNodes(cloneDeep(history[newIndex]));
      setSelectedId(null);
    }
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setTextNodes((prevNodes) =>
      prevNodes.filter((node) => node.id !== selectedId)
    );
    setSelectedId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">Konva.js Text Editor</h1>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Controls */}
        <div className="bg-white p-4 shadow-md w-full md:w-64 flex flex-col gap-4">
          <button
            onClick={addTextNode}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            Add Text
          </button>

          {selectedId && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Font Color</label>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-full h-10"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  Font Size: {currentFontSize}
                </label>
                <input
                  type="range"
                  min="10"
                  max="72"
                  value={currentFontSize}
                  onChange={(e) =>
                    handleFontSizeChange(parseInt(e.target.value))
                  }
                  className="w-full"
                />
              </div>

              <button
                onClick={deleteSelected}
                className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
              >
                Delete Selected
              </button>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className={`py-2 px-4 rounded ${
                historyIndex <= 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gray-500 hover:bg-gray-600 text-white"
              }`}
            >
              Undo (Ctrl+Z)
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className={`py-2 px-4 rounded ${
                historyIndex >= history.length - 1
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gray-500 hover:bg-gray-600 text-white"
              }`}
            >
              Redo (Ctrl+Y)
            </button>
          </div>

          <button
            onClick={exportAsImage}
            className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded mt-auto"
          >
            Export as Image
          </button>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          <div className="relative border border-gray-300 bg-white shadow-sm">
            <Stage
              width={Math.min(window.innerWidth * 0.8, 800)}
              height={Math.min(window.innerHeight * 0.7, 600)}
              ref={stageRef}
              onClick={handleStageClick}
              className="mx-auto"
            >
              <Layer>
                {textNodes.map((node) => (
                  <React.Fragment key={node.id}>
                    {!node.isEditing && (
                      <Text
                        id={node.id}
                        name="text-node"
                        x={node.x}
                        y={node.y}
                        text={node.text}
                        fontSize={node.fontSize}
                        fill={node.fontColor}
                        draggable
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDblClick={handleTextDoubleClick}
                        onTransform={handleTransform}
                        onTransformEnd={handleTransformEnd}
                      />
                    )}
                  </React.Fragment>
                ))}

                {selectedId &&
                  !textNodes.find((n) => n.id === selectedId)?.isEditing && (
                    <Transformer
                      ref={transformerRef}
                      boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 5 || newBox.height < 5) {
                          return oldBox;
                        }
                        return newBox;
                      }}
                    />
                  )}
              </Layer>
            </Stage>

            {textNodes.some((n) => n.isEditing) && (
              <input
                ref={textInputRef}
                defaultValue={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleInputBlur();
                  }
                }}
                style={{
                  fontSize: `${currentFontSize}px`,
                  color: currentColor,
                  border: "none",
                  padding: "0",
                  margin: "0",
                  background: "transparent",
                  outline: "none",
                }}
                className="absolute"
              />
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-200 p-4 text-sm text-gray-600">
        <p>
          Double click text to edit | Drag to move | Use handles to resize |
          Undo: Ctrl+Z | Redo: Ctrl+Y
        </p>
      </div>
    </div>
  );
};

export default KonvaTextEditor;