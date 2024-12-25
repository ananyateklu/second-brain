namespace SecondBrain.Api.Enums
{
    public enum ActivityActionType
    {
        CREATE,
        UPDATE,
        DELETE,
        ARCHIVE,
        LINK,
        UNLINK,
        SEARCH,
        PIN,
        UNPIN,
        FAVORITE,
        UNFAVORITE,
        AI_CHAT_CREATE,
        AI_MESSAGE_SEND,
        AI_MESSAGE_RECEIVE,
        AI_CHAT_DELETE,
        AI_MESSAGE_REACT
    }

    public enum ActivityItemType
    {
        NOTE,
        IDEA,
        NOTELINK,
        AI_CHAT,
        AI_MESSAGE
    }
}