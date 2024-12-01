import { X, Link2, Calendar, Tag } from 'lucide-react';
import { Note } from '../../../contexts/NotesContext';
import { LinkType } from './types';

interface DetailPaneProps {
  note: Note;
  onClose: () => void;
  linkTypes: LinkType[];
}

export function DetailPane({ note, onClose, linkTypes }: DetailPaneProps) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#1C1C1E] dark:bg-[#1C1C1E] border-l border-[#2C2C2E] dark:border-[#2C2C2E] shadow-xl">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-[#2C2C2E] dark:border-[#2C2C2E]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100 dark:text-gray-100">
              Note Details
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[#2C2C2E] transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-100">
                {note.title}
              </h2>
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Link2 className="w-4 h-4" />
                  <span>3 links</span>
                </div>
              </div>
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-300">
                {note.content}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-100 mb-2">
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {note.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#64ab6f]/20 text-[#64ab6f] text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-100 mb-2">
                Linked Notes
              </h4>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-[#2C2C2E] hover:border-[#64ab6f] transition-colors cursor-pointer bg-[#1C1C1E]">
                  <h5 className="font-medium text-gray-100">
                    Related Note Title
                  </h5>
                  <p className="text-sm text-gray-400">
                    Brief preview of the linked note...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}