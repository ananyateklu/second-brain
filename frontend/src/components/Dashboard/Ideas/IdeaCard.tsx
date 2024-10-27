<diff>
@@ -1,1 +1,1 @@
-import { Star, Link2, Tag, Lightbulb } from 'lucide-react';
+import { Star, Link2, Tag, Lightbulb, Archive } from 'lucide-react';
@@ -15,1 +15,1 @@
-  const { toggleFavoriteNote } = useNotes();
+  const { toggleFavoriteNote, archiveNote } = useNotes();
@@ -26,0 +27,5 @@
+  const handleArchive = (e: React.MouseEvent) => {
+    e.stopPropagation();
+    archiveNote(idea.id);
+  };
+
@@ -82,0 +88,8 @@
+
+            <button
+              onClick={handleArchive}
+              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
+              title="Archive idea"
+            >
+              <Archive className="w-4 h-4" />
+            </button>
</diff>