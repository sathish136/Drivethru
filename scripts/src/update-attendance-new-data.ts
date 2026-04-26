import { db } from "@workspace/db";
import { attendanceRecords, employees } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// Raw attendance data from user input
const employeesData = {
  "HR-EMP-00020": {
    name: "Anuradha",
    location: "Madiha",
    data: [
      "01/02/2026,10:06:18AM",
      "02/02/2026,08:43:02AM", 
      "02/02/2026,05:16:15PM"
    ]
  },
  "SC-EMP-00003": {
    name: "Asoka", 
    location: "Polhena",
    data: [
      "01/02/2026,07:55:02AM", "01/02/2026,02:43:21PM", "01/02/2026,03:37:50PM", "01/02/2026,03:38:56PM", "01/02/2026,05:02:21PM",
      "02/02/2026,07:57:33AM", "02/02/2026,03:20:17PM", "02/02/2026,03:59:50PM", "02/02/2026,07:00:19PM",
      "03/02/2026,07:58:31AM", "03/02/2026,02:47:03PM", "03/02/2026,03:44:41PM", "03/02/2026,05:01:25PM",
      "04/02/2026,10:26:41AM", "04/02/2026,02:24:49PM", "04/02/2026,03:23:05PM", "04/02/2026,07:00:31PM",
      "06/02/2026,10:53:58AM", "06/02/2026,02:43:44PM", "06/02/2026,03:32:47PM", "06/02/2026,07:06:56PM",
      "07/02/2026,07:55:27AM", "07/02/2026,01:55:01PM",
      "09/02/2026,07:56:18AM", "09/02/2026,03:01:49PM", "09/02/2026,04:01:13PM", "09/02/2026,07:44:19PM",
      "10/02/2026,07:56:30AM", "10/02/2026,03:00:15PM", "10/02/2026,04:04:50PM", "10/02/2026,05:00:01PM",
      "11/02/2026,10:55:35AM", "11/02/2026,02:52:17PM", "11/02/2026,03:46:46PM", "11/02/2026,07:50:27PM",
      "13/02/2026,10:48:58AM", "13/02/2026,02:25:33PM", "13/02/2026,03:27:31PM", "13/02/2026,07:49:29PM",
      "14/02/2026,01:50:35PM", "14/02/2026,07:00:48PM",
      "16/02/2026,07:48:12AM", "16/02/2026,02:39:28PM", "16/02/2026,03:45:53PM", "16/02/2026,07:11:53PM",
      "17/02/2026,06:39:51AM", "17/02/2026,03:03:49PM", "17/02/2026,03:42:56PM", "17/02/2026,05:00:14PM",
      "18/02/2026,10:45:21AM", "18/02/2026,02:26:51PM", "18/02/2026,03:27:23PM", "18/02/2026,07:14:08PM",
      "20/02/2026,10:52:40AM", "20/02/2026,02:40:56PM", "20/02/2026,03:28:03PM", "20/02/2026,06:50:30PM",
      "21/02/2026,07:55:04AM", "21/02/2026,02:26:17PM", "21/02/2026,03:12:16PM", "21/02/2026,07:53:30PM",
      "22/02/2026,07:57:24AM", "22/02/2026,02:23:25PM", "22/02/2026,03:22:40PM", "22/02/2026,05:00:59PM",
      "23/02/2026,07:52:27AM", "23/02/2026,02:43:13PM", "23/02/2026,03:45:07PM", "23/02/2026,07:06:53PM",
      "24/02/2026,07:56:37AM", "24/02/2026,02:50:23PM", "24/02/2026,03:44:32PM", "24/02/2026,03:44:33PM", "24/02/2026,05:00:36PM",
      "25/02/2026,10:58:22AM", "25/02/2026,10:58:26AM", "25/02/2026,02:39:23PM", "25/02/2026,04:04:54PM", "25/02/2026,07:52:47PM",
      "27/02/2026,10:53:25AM", "27/02/2026,03:00:44PM", "27/02/2026,04:04:37PM", "27/02/2026,07:48:03PM",
      "28/02/2026,07:59:09AM", "28/02/2026,02:00:22PM"
    ]
  },
  "HR-EMP-00022": {
    name: "Lakshan",
    location: "Madiha", 
    data: [
      "02/02/2026,05:52:57AM", "02/02/2026,02:41:13PM",
      "03/02/2026,06:07:33AM", "03/02/2026,02:23:04PM",
      "04/02/2026,06:09:15AM", "04/02/2026,02:19:57PM",
      "05/02/2026,05:43:37AM",
      "06/02/2026,05:56:13AM", "06/02/2026,03:28:28PM",
      "07/02/2026,09:07:28AM", "07/02/2026,10:16:43AM",
      "08/02/2026,08:24:07AM", "08/02/2026,09:40:27AM", "08/02/2026,07:38:08PM", "08/02/2026,08:06:42PM",
      "09/02/2026,05:49:36AM", "09/02/2026,11:16:24AM", "09/02/2026,01:09:13PM", "09/02/2026,01:38:51PM",
      "10/02/2026,06:14:32AM", "10/02/2026,12:55:51PM",
      "11/02/2026,05:47:46AM", "11/02/2026,12:18:28PM", "11/02/2026,02:36:54PM",
      "12/02/2026,05:44:53AM", "12/02/2026,02:36:43PM",
      "13/02/2026,05:49:37AM", "13/02/2026,12:25:05PM", "13/02/2026,02:30:38PM",
      "14/02/2026,08:53:05AM", "14/02/2026,10:50:40AM",
      "16/02/2026,08:35:34AM", "16/02/2026,04:53:49PM", "16/02/2026,05:16:36PM", "16/02/2026,07:34:40PM", "16/02/2026,08:11:57PM",
      "17/02/2026,05:45:18AM", "17/02/2026,10:15:54AM", "17/02/2026,12:59:23PM", "17/02/2026,01:27:27PM", "17/02/2026,05:55:37PM",
      "18/02/2026,06:08:10AM", "18/02/2026,12:55:40PM",
      "19/02/2026,05:52:15AM", "19/02/2026,06:06:47AM", "19/02/2026,01:16:59PM", "19/02/2026,01:52:55PM", "19/02/2026,01:52:56PM", "19/02/2026,03:27:27PM",
      "20/02/2026,06:02:23AM", "20/02/2026,10:25:52AM", "20/02/2026,01:50:57PM", "20/02/2026,03:01:20PM",
      "22/02/2026,07:34:04PM", "22/02/2026,08:04:24PM",
      "23/02/2026,05:55:04AM", "23/02/2026,01:32:35PM", "23/02/2026,01:54:58PM",
      "24/02/2026,05:52:11AM", "24/02/2026,08:04:18AM", "24/02/2026,12:42:21PM", "24/02/2026,01:21:04PM",
      "25/02/2026,05:26:28AM", "25/02/2026,08:13:33AM", "25/02/2026,12:45:49PM",
      "26/02/2026,05:45:47AM", "26/02/2026,08:40:49AM",
      "27/02/2026,05:45:45AM", "27/02/2026,08:39:46AM", "27/02/2026,01:17:22PM", "27/02/2026,02:05:03PM",
      "28/02/2026,09:01:00AM", "28/02/2026,10:48:29AM"
    ]
  },
  "HR-EMP-00023": {
    name: "Mari",
    location: "Madiha",
    data: [
      "02/02/2026,06:10:29AM", "02/02/2026,03:59:23PM",
      "03/02/2026,08:22:07AM", "03/02/2026,05:02:59PM",
      "04/02/2026,05:55:17AM", "04/02/2026,09:10:39AM", "04/02/2026,12:12:16PM", "04/02/2026,04:39:22PM",
      "05/02/2026,06:05:21AM", "05/02/2026,09:00:34AM", "05/02/2026,12:46:13PM", "05/02/2026,04:33:34PM",
      "06/02/2026,06:13:35AM", "06/02/2026,09:05:17AM", "06/02/2026,12:15:04PM", "06/02/2026,03:59:31PM",
      "07/02/2026,09:45:23AM", "07/02/2026,01:54:01PM",
      "09/02/2026,05:47:00AM", "09/02/2026,01:30:29PM", "09/02/2026,01:57:39PM", "09/02/2026,02:12:10PM",
      "10/02/2026,05:51:07AM", "10/02/2026,01:54:13PM",
      "11/02/2026,05:56:31AM", "11/02/2026,01:24:18PM", "11/02/2026,01:57:07PM", "11/02/2026,04:44:48PM",
      "12/02/2026,05:55:30AM", "12/02/2026,11:16:42AM",
      "13/02/2026,05:41:48AM", "13/02/2026,02:13:10PM", "13/02/2026,02:27:50PM",
      "14/02/2026,09:13:35AM", "14/02/2026,02:15:25PM",
      "16/02/2026,05:50:56AM", "16/02/2026,08:47:49AM", "16/02/2026,09:51:56AM", "16/02/2026,01:58:30PM", "16/02/2026,02:37:52PM", "16/02/2026,02:40:41PM",
      "17/02/2026,08:21:11AM", "17/02/2026,01:55:31PM", "17/02/2026,02:03:14PM",
      "18/02/2026,08:26:19AM", "18/02/2026,12:55:30PM", "18/02/2026,01:21:15PM", "18/02/2026,04:08:32PM",
      "19/02/2026,06:06:31AM", "19/02/2026,09:17:01AM", "19/02/2026,12:52:06PM", "19/02/2026,01:17:06PM", "19/02/2026,01:52:47PM", "19/02/2026,04:27:43PM",
      "20/02/2026,06:02:05AM", "20/02/2026,09:00:09AM", "20/02/2026,09:54:09AM", "20/02/2026,01:17:37PM", "20/02/2026,01:51:18PM", "20/02/2026,02:14:40PM",
      "21/02/2026,07:28:13PM", "21/02/2026,08:56:01PM",
      "23/02/2026,05:43:01AM", "23/02/2026,08:49:04AM", "23/02/2026,01:13:17PM", "23/02/2026,01:57:48PM", "23/02/2026,02:09:11PM", "23/02/2026,03:56:36PM",
      "24/02/2026,05:46:31AM", "24/02/2026,09:16:02AM", "24/02/2026,12:05:23PM", "24/02/2026,12:18:59PM", "24/02/2026,01:57:02PM", "24/02/2026,02:05:34PM", "24/02/2026,04:15:45PM",
      "25/02/2026,06:09:32AM", "25/02/2026,08:56:40AM", "25/02/2026,09:32:12AM", "25/02/2026,01:13:35PM", "25/02/2026,01:37:53PM", "25/02/2026,02:19:00PM",
      "26/02/2026,05:48:27AM", "26/02/2026,08:44:16AM", "26/02/2026,09:15:06AM", "26/02/2026,01:05:51PM", "26/02/2026,01:27:05PM", "26/02/2026,01:52:56PM",
      "27/02/2026,05:53:31AM", "27/02/2026,08:51:02AM", "27/02/2026,08:58:45AM", "27/02/2026,10:00:15AM", "27/02/2026,01:53:49PM",
      "28/02/2026,09:00:48AM", "28/02/2026,10:16:57AM", "28/02/2026,01:24:44PM", "28/02/2026,02:36:00PM"
    ]
  },
  "HR-EMP-00026": {
    name: "Nadeera",
    location: "Madiha",
    data: [
      "01/02/2026,08:18:22AM", "01/02/2026,01:40:18PM",
      "02/02/2026,08:35:20AM", "02/02/2026,01:24:03PM", "02/02/2026,02:32:26PM", "02/02/2026,05:25:00PM",
      "03/02/2026,08:29:48AM", "03/02/2026,01:07:52PM", "03/02/2026,02:36:39PM", "03/02/2026,05:23:51PM",
      "04/02/2026,08:34:37AM", "04/02/2026,01:45:45PM",
      "06/02/2026,08:24:37AM", "06/02/2026,01:19:55PM", "06/02/2026,02:29:16PM", "06/02/2026,05:20:50PM",
      "07/02/2026,01:19:03PM", "07/02/2026,02:37:56PM", "07/02/2026,05:19:37PM",
      "08/02/2026,08:31:51AM", "08/02/2026,01:35:53PM", "08/02/2026,02:35:13PM", "08/02/2026,05:10:01PM",
      "09/02/2026,08:23:51AM", "09/02/2026,01:39:22PM", "09/02/2026,02:35:43PM", "09/02/2026,05:19:40PM",
      "10/02/2026,08:24:56AM", "10/02/2026,01:41:40PM", "10/02/2026,02:34:31PM", "10/02/2026,05:21:51PM",
      "11/02/2026,08:21:12AM", "11/02/2026,01:26:35PM",
      "13/02/2026,08:23:36AM", "13/02/2026,01:29:16PM", "13/02/2026,02:44:07PM",
      "15/02/2026,08:17:40AM", "15/02/2026,01:22:10PM", "15/02/2026,02:27:07PM", "15/02/2026,05:25:06PM",
      "16/02/2026,08:20:38AM", "16/02/2026,02:25:39PM", "16/02/2026,05:17:01PM",
      "17/02/2026,08:55:52AM", "17/02/2026,01:18:42PM", "17/02/2026,04:56:22PM",
      "18/02/2026,08:30:58AM", "18/02/2026,01:18:43PM",
      "20/02/2026,08:22:01AM", "20/02/2026,01:13:45PM", "20/02/2026,02:30:30PM", "20/02/2026,04:47:55PM",
      "21/02/2026,08:20:10AM", "21/02/2026,01:11:21PM", "21/02/2026,02:17:21PM", "21/02/2026,05:06:41PM",
      "22/02/2026,08:19:58AM", "22/02/2026,01:14:02PM", "22/02/2026,02:21:07PM", "22/02/2026,05:02:10PM",
      "23/02/2026,08:19:38AM", "23/02/2026,01:31:55PM", "23/02/2026,02:54:33PM", "23/02/2026,05:12:25PM",
      "24/02/2026,08:23:25AM", "24/02/2026,01:17:06PM", "24/02/2026,02:22:29PM", "24/02/2026,04:18:04PM",
      "25/02/2026,08:18:29AM", "25/02/2026,01:30:19PM",
      "27/02/2026,08:29:18AM", "27/02/2026,02:30:15PM", "27/02/2026,05:00:59PM",
      "28/02/2026,08:21:33AM", "28/02/2026,01:19:46PM", "28/02/2026,05:12:57PM"
    ]
  },
  "HR-EMP-00027": {
    name: "Nadun",
    location: "Madiha",
    data: [
      "01/02/2026,12:48:26PM", "01/02/2026,04:29:59PM",
      "02/02/2026,06:13:09AM", "02/02/2026,02:06:15PM",
      "03/02/2026,05:57:12AM", "03/02/2026,03:29:26PM",
      "04/02/2026,07:28:14AM", "04/02/2026,03:21:52PM",
      "05/02/2026,05:54:48AM", "05/02/2026,09:00:47AM", "05/02/2026,09:36:53AM", "05/02/2026,01:48:09PM",
      "06/02/2026,06:03:03AM", "06/02/2026,08:58:26AM", "06/02/2026,09:57:54AM", "06/02/2026,03:30:05PM",
      "08/02/2026,01:18:48PM", "08/02/2026,05:48:47PM",
      "09/02/2026,08:39:09AM", "09/02/2026,11:17:38AM", "09/02/2026,12:00:11PM", "09/02/2026,01:30:22PM", "09/02/2026,01:57:51PM", "09/02/2026,05:13:37PM", "09/02/2026,06:08:00PM", "09/02/2026,06:35:24PM",
      "10/02/2026,05:53:12AM", "10/02/2026,08:54:14AM", "10/02/2026,12:09:59PM", "10/02/2026,01:36:45PM", "10/02/2026,01:55:10PM", "10/02/2026,04:07:08PM",
      "11/02/2026,06:07:30AM", "11/02/2026,09:09:22AM", "11/02/2026,01:05:14PM", "11/02/2026,01:24:11PM", "11/02/2026,01:50:51PM", "11/02/2026,04:46:14PM",
      "12/02/2026,05:44:44AM", "12/02/2026,10:48:28AM", "12/02/2026,11:28:29AM", "12/02/2026,01:41:29PM", "12/02/2026,01:53:39PM", "12/02/2026,03:49:22PM",
      "13/02/2026,05:42:17AM", "13/02/2026,11:49:06AM", "13/02/2026,12:40:08PM", "13/02/2026,03:56:32PM",
      "15/02/2026,01:22:27PM", "15/02/2026,05:00:58PM",
      "16/02/2026,06:05:45AM", "16/02/2026,09:04:28AM", "16/02/2026,11:27:12AM", "16/02/2026,02:31:16PM",
      "17/02/2026,05:58:01AM", "17/02/2026,09:24:12AM", "17/02/2026,10:22:53AM", "17/02/2026,02:02:44PM",
      "18/02/2026,08:33:22AM", "18/02/2026,11:40:26AM", "18/02/2026,12:32:59PM", "18/02/2026,03:01:39PM",
      "19/02/2026,05:50:02AM", "19/02/2026,08:31:09AM", "19/02/2026,09:55:57AM", "19/02/2026,01:16:42PM", "19/02/2026,01:32:10PM", "19/02/2026,02:15:31PM",
      "20/02/2026,05:47:41AM", "20/02/2026,07:54:05AM", "20/02/2026,10:14:48AM", "20/02/2026,01:41:21PM",
      "22/02/2026,01:46:43PM", "22/02/2026,05:10:23PM",
      "23/02/2026,05:44:56AM", "23/02/2026,08:48:22AM", "23/02/2026,10:22:22AM", "23/02/2026,02:09:01PM",
      "24/02/2026,06:06:22AM", "24/02/2026,08:48:42AM", "24/02/2026,12:36:24PM", "24/02/2026,03:53:25PM",
      "25/02/2026,05:36:25AM", "25/02/2026,08:28:53AM", "25/02/2026,09:40:11AM", "25/02/2026,01:08:16PM", "25/02/2026,01:28:14PM", "25/02/2026,02:22:33PM",
      "26/02/2026,06:03:22AM", "26/02/2026,09:04:04AM", "26/02/2026,12:54:50PM", "26/02/2026,03:55:00PM",
      "27/02/2026,05:45:33AM", "27/02/2026,08:52:44AM", "27/02/2026,09:37:13AM", "27/02/2026,12:02:16PM"
    ]
  },
  "SC-EMP-00004": {
    name: "Nimesh",
    location: "Polhena",
    data: [
      "01/02/2026,10:45:04AM", "01/02/2026,03:11:32PM", "01/02/2026,04:12:52PM", "01/02/2026,07:54:02PM",
      "03/02/2026,11:10:32AM", "03/02/2026,01:47:47PM", "03/02/2026,02:46:38PM", "03/02/2026,07:54:55PM",
      "04/02/2026,07:58:54AM", "04/02/2026,01:38:20PM", "04/02/2026,02:24:09PM", "04/02/2026,04:52:48PM",
      "05/02/2026,08:01:12AM", "05/02/2026,03:09:10PM", "05/02/2026,04:08:43PM", "05/02/2026,07:55:13PM",
      "06/02/2026,08:01:36AM", "06/02/2026,08:05:16AM", "06/02/2026,01:28:20PM", "06/02/2026,02:33:09PM", "06/02/2026,05:01:26PM",
      "07/02/2026,01:53:31PM", "07/02/2026,07:52:04PM",
      "08/02/2026,07:56:26AM", "08/02/2026,02:34:25PM", "08/02/2026,03:22:46PM", "08/02/2026,07:03:33PM",
      "10/02/2026,11:08:32AM", "10/02/2026,03:30:25PM", "10/02/2026,04:29:12PM", "10/02/2026,06:53:37PM",
      "11/02/2026,07:59:31AM", "11/02/2026,02:45:35PM", "11/02/2026,03:32:28PM", "11/02/2026,04:59:07PM",
      "12/02/2026,08:01:40AM", "12/02/2026,02:47:27PM", "12/02/2026,03:41:27PM", "12/02/2026,07:03:03PM",
      "13/02/2026,07:57:02AM", "13/02/2026,01:36:38PM", "13/02/2026,02:46:03PM", "13/02/2026,05:01:09PM",
      "14/02/2026,07:55:14AM", "14/02/2026,01:50:40PM",
      "15/02/2026,07:55:15AM", "15/02/2026,03:06:27PM", "15/02/2026,04:05:34PM", "15/02/2026,07:40:34PM",
      "17/02/2026,09:39:34AM", "17/02/2026,11:04:10AM", "17/02/2026,03:59:31PM", "17/02/2026,04:49:50PM", "17/02/2026,07:59:45PM",
      "18/02/2026,07:56:54AM", "18/02/2026,01:49:41PM", "18/02/2026,03:12:20PM", "18/02/2026,04:42:10PM",
      "19/02/2026,08:08:22AM", "19/02/2026,03:00:50PM", "19/02/2026,03:51:21PM", "19/02/2026,03:51:22PM", "19/02/2026,07:50:32PM",
      "20/02/2026,07:58:45AM", "20/02/2026,01:39:50PM", "20/02/2026,02:43:48PM", "20/02/2026,05:08:35PM",
      "22/02/2026,11:03:55AM", "22/02/2026,02:48:21PM", "22/02/2026,03:45:39PM", "22/02/2026,07:20:40PM",
      "24/02/2026,11:06:25AM", "24/02/2026,03:00:51PM", "24/02/2026,03:57:01PM", "24/02/2026,07:57:10PM",
      "25/02/2026,08:05:19AM", "25/02/2026,01:27:12PM", "25/02/2026,02:24:39PM", "25/02/2026,05:03:21PM",
      "26/02/2026,08:00:13AM", "26/02/2026,08:02:14AM", "26/02/2026,02:31:38PM", "26/02/2026,03:33:33PM", "26/02/2026,07:47:24PM",
      "27/02/2026,07:58:44AM", "27/02/2026,03:18:56PM", "27/02/2026,04:28:10PM", "27/02/2026,05:11:20PM",
      "28/02/2026,02:00:54PM", "28/02/2026,07:53:10PM"
    ]
  },
  "HR-EMP-00021": {
    name: "Ramyalatha",
    location: "Madiha",
    data: [
      "01/02/2026,07:28:20AM", "01/02/2026,02:24:12PM", "01/02/2026,04:03:53PM",
      "02/02/2026,07:13:52AM", "02/02/2026,02:50:01PM", "02/02/2026,04:13:53PM", "02/02/2026,08:21:55PM",
      "03/02/2026,07:15:55AM", "03/02/2026,02:50:28PM", "03/02/2026,04:20:20PM", "03/02/2026,08:46:56PM",
      "05/02/2026,07:12:30AM", "05/02/2026,02:28:53PM", "05/02/2026,04:02:10PM", "05/02/2026,08:24:57PM",
      "06/02/2026,07:16:26AM", "06/02/2026,02:23:50PM", "06/02/2026,04:10:42PM", "06/02/2026,08:20:51PM",
      "07/02/2026,07:54:01AM", "07/02/2026,02:22:57PM",
      "08/02/2026,07:42:58AM", "08/02/2026,02:37:26PM", "08/02/2026,03:37:37PM", "08/02/2026,08:20:03PM",
      "09/02/2026,07:09:38AM", "09/02/2026,02:38:35PM", "09/02/2026,04:06:57PM", "09/02/2026,08:28:17PM",
      "10/02/2026,07:10:25AM", "10/02/2026,02:50:33PM", "10/02/2026,04:10:08PM", "10/02/2026,08:23:37PM",
      "12/02/2026,07:17:54AM", "12/02/2026,02:37:35PM", "12/02/2026,03:59:38PM", "12/02/2026,08:30:56PM",
      "13/02/2026,07:14:52AM", "13/02/2026,02:46:38PM", "13/02/2026,03:56:48PM", "13/02/2026,08:30:24PM",
      "14/02/2026,07:53:48AM", "14/02/2026,02:21:49PM",
      "15/02/2026,07:35:27AM", "15/02/2026,02:38:16PM", "15/02/2026,03:25:46PM", "15/02/2026,08:15:49PM",
      "17/02/2026,07:13:10AM", "17/02/2026,02:17:33PM", "17/02/2026,04:00:46PM", "17/02/2026,08:43:31PM",
      "20/02/2026,07:10:15AM", "20/02/2026,02:07:21PM", "20/02/2026,03:55:40PM", "20/02/2026,08:23:49PM",
      "21/02/2026,07:58:48AM", "21/02/2026,01:52:51PM",
      "22/02/2026,07:45:13AM", "22/02/2026,02:20:56PM", "22/02/2026,03:18:07PM", "22/02/2026,07:56:46PM",
      "23/02/2026,07:04:12AM", "23/02/2026,02:26:28PM", "23/02/2026,03:55:44PM", "23/02/2026,08:31:58PM",
      "24/02/2026,07:09:49AM", "24/02/2026,02:31:13PM", "24/02/2026,03:58:33PM", "24/02/2026,08:17:24PM",
      "26/02/2026,07:08:43AM", "26/02/2026,02:23:02PM", "26/02/2026,03:46:31PM", "26/02/2026,08:28:11PM",
      "27/02/2026,07:19:09AM", "27/02/2026,02:25:33PM", "27/02/2026,03:55:58PM", "27/02/2026,08:27:30PM",
      "28/02/2026,07:36:15AM", "28/02/2026,02:21:50PM"
    ]
  },
  "HR-EMP-00024": {
    name: "Ridmika (1)",
    location: "Madiha",
    data: [
      "02/02/2026,05:58:22AM", "02/02/2026,09:10:08AM", "02/02/2026,11:49:49AM", "02/02/2026,12:46:23PM", "02/02/2026,01:23:11PM", "02/02/2026,03:26:48PM",
      "03/02/2026,01:31:50PM", "03/02/2026,05:12:33PM",
      "04/02/2026,05:55:31AM", "04/02/2026,03:59:57PM",
      "05/02/2026,05:43:15AM",
      "09/02/2026,06:28:29AM", "09/02/2026,09:03:00AM",
      "10/02/2026,10:16:59AM", "10/02/2026,01:55:21PM", "10/02/2026,02:21:56PM",
      "11/02/2026,05:52:50AM", "11/02/2026,01:23:26PM", "11/02/2026,01:51:01PM", "11/02/2026,03:31:37PM",
      "12/02/2026,05:36:30AM", "12/02/2026,02:33:45PM",
      "13/02/2026,05:35:34AM", "13/02/2026,02:13:50PM", "13/02/2026,02:27:59PM",
      "14/02/2026,12:13:09PM", "14/02/2026,12:22:34PM", "14/02/2026,12:32:26PM", "14/02/2026,02:43:55PM", "14/02/2026,02:48:45PM", "14/02/2026,04:02:35PM",
      "16/02/2026,08:19:20AM", "16/02/2026,01:52:41PM", "16/02/2026,02:13:57PM", "16/02/2026,02:45:11PM",
      "17/02/2026,08:30:08AM", "17/02/2026,02:11:37PM", "17/02/2026,02:21:47PM", "17/02/2026,04:31:03PM",
      "18/02/2026,08:49:12AM", "18/02/2026,12:27:33PM", "18/02/2026,01:07:50PM", "18/02/2026,03:13:47PM", "18/02/2026,03:22:09PM", "18/02/2026,04:20:58PM"
    ]
  }
};

function parseDateTime(dateTimeStr: string): Date {
  // Parse format: "02/02/2026,09:44:13AM"
  const [datePart, timePart] = dateTimeStr.split(',');
  const [day, month, year] = datePart.split('/').map(Number);
  
  let time = timePart;
  let hour = parseInt(time.substring(0, 2));
  const minute = parseInt(time.substring(3, 5));
  const second = parseInt(time.substring(6, 8));
  const period = time.substring(8); // AM or PM
  
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  return new Date(year, month - 1, day, hour, minute, second);
}

function formatTime(date: Date): string {
  return date.toTimeString().substring(0, 8); // HH:MM:SS
}

function calculateWorkHours(inTime: Date, outTime: Date): number {
  const diffMs = outTime.getTime() - inTime.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
}

function processDailyPunches(punches: Date[]): {
  inTime1: string | null;
  outTime1: string | null;
  inTime2: string | null;
  outTime2: string | null;
  workHours1: number | null;
  workHours2: number | null;
  totalHours: number | null;
  overtimeHours: number | null;
  status: "present" | "absent" | "late" | "half_day";
} {
  if (punches.length === 0) {
    return {
      inTime1: null, outTime1: null, inTime2: null, outTime2: null,
      workHours1: null, workHours2: null, totalHours: null, overtimeHours: null,
      status: "absent"
    };
  }

  // Sort punches by time
  punches.sort((a, b) => a.getTime() - b.getTime());

  // Use the first punch as In 1 and last punch as Out 2
  let inTime1: Date | null = punches[0];
  let outTime1: Date | null = null;
  let inTime2: Date | null = null;
  let outTime2: Date | null = punches[punches.length - 1];

  // For single punch, In 1 = Out 1
  if (punches.length === 1) {
    outTime1 = punches[0];
    inTime2 = null;
    outTime2 = null;
  } 
  // For two punches, simple In 1 and Out 1
  else if (punches.length === 2) {
    outTime1 = punches[1];
    inTime2 = null;
    outTime2 = null;
  }
  // For three punches, In 1, Out 1, In 2
  else if (punches.length === 3) {
    outTime1 = punches[1];
    inTime2 = punches[2];
    outTime2 = null;
  }
  // For four or more punches, look for natural breaks
  else {
    // Look for lunch break gap (typically 1-2 hours between 11 AM - 2 PM)
    let lunchBreakIndex = -1;
    for (let i = 1; i < punches.length - 1; i++) {
      const currentHour = punches[i].getHours();
      const nextHour = punches[i + 1].getHours();
      const gap = (punches[i + 1].getTime() - punches[i].getTime()) / (1000 * 60 * 60);
      
      // Look for gap around lunch time (11 AM - 2 PM) with at least 30 minutes break
      if ((currentHour >= 11 && currentHour <= 14) && gap >= 0.5 && gap <= 3) {
        lunchBreakIndex = i;
        break;
      }
    }

    if (lunchBreakIndex > 0) {
      // Split at lunch break
      outTime1 = punches[lunchBreakIndex];
      inTime2 = punches[lunchBreakIndex + 1];
      outTime2 = punches[punches.length - 1];
    } else {
      // If no clear lunch break, split in the middle
      const midPoint = Math.floor(punches.length / 2);
      outTime1 = punches[midPoint];
      inTime2 = punches[midPoint + 1];
    }
  }

  const workHours1 = inTime1 && outTime1 ? calculateWorkHours(inTime1, outTime1) : null;
  const workHours2 = inTime2 && outTime2 ? calculateWorkHours(inTime2, outTime2) : null;
  const totalHours = workHours1 && workHours2 ? workHours1 + workHours2 : workHours1;
  const overtimeHours = totalHours && totalHours > 8 ? totalHours - 8 : null;

  // Determine status
  let status: "present" | "absent" | "late" | "half_day" = "present";
  if (inTime1 && (inTime1.getHours() > 8 || (inTime1.getHours() === 8 && inTime1.getMinutes() > 15))) {
    status = "late";
  } else if (totalHours && totalHours < 4) {
    status = "half_day";
  }

  return {
    inTime1: inTime1 ? formatTime(inTime1) : null,
    outTime1: outTime1 ? formatTime(outTime1) : null,
    inTime2: inTime2 ? formatTime(inTime2) : null,
    outTime2: outTime2 ? formatTime(outTime2) : null,
    workHours1,
    workHours2,
    totalHours,
    overtimeHours,
    status
  };
}

async function updateAttendanceFromRawData() {
  console.log("Updating attendance data for multiple employees...");

  try {
    for (const [employeeCode, employeeInfo] of Object.entries(employeesData)) {
      console.log(`\n📋 Processing employee: ${employeeCode} - ${employeeInfo.name}`);

      // Find employee by employee code
      const employee = await db.select().from(employees).where(eq(employees.employeeId, employeeCode)).limit(1);
      
      if (employee.length === 0) {
        console.log(`❌ Employee ${employeeCode} not found. Creating employee record...`);
        
        // Create employee record
        const [newEmployee] = await db.insert(employees).values({
          employeeId: employeeCode,
          fullName: employeeInfo.name,
          designation: "Employee",
          department: employeeCode.startsWith("SC-") ? "SC" : "HR",
          branchId: employeeInfo.location === "Polhena" ? 2 : 1, // 1 = Head Office (Madiha), 2 = Polhena
          shiftId: 1, // Default shift
          joiningDate: "2026-01-01",
          email: `${employeeInfo.name.toLowerCase().replace(' ', '')}@slpost.lk`,
          phone: "+94-XX-XXXXXXX",
          biometricId: employeeCode,
          status: "active"
        }).returning();
        
        console.log(`✅ Created employee record for ${employeeCode}`);
        
        // Delete existing attendance records for this employee
        await db.delete(attendanceRecords).where(eq(attendanceRecords.employeeId, newEmployee.id));
        var empId = newEmployee.id;
      } else {
        console.log(`✅ Found employee: ${employee[0].fullName}`);
        
        // Delete existing attendance records for this employee
        await db.delete(attendanceRecords).where(eq(attendanceRecords.employeeId, employee[0].id));
        var empId = employee[0].id;
      }

      // Parse raw data and group by date
      const dailyData: Record<string, Date[]> = {};
      
      for (const timeStr of employeeInfo.data) {
        const date = parseDateTime(timeStr);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = [];
        }
        dailyData[dateKey].push(date);
      }

      console.log(`📊 Processing ${Object.keys(dailyData).length} days of attendance data...`);

      // Process each day and create attendance records
      const attendanceRecordsToInsert = [];
      
      for (const [date, punches] of Object.entries(dailyData)) {
        const processed = processDailyPunches(punches);
        
        attendanceRecordsToInsert.push({
          employeeId: empId,
          branchId: employeeInfo.location === "Polhena" ? 2 : 1,
          date,
          status: processed.status,
          inTime1: processed.inTime1,
          outTime1: processed.outTime1,
          workHours1: processed.workHours1,
          inTime2: processed.inTime2,
          outTime2: processed.outTime2,
          workHours2: processed.workHours2,
          totalHours: processed.totalHours,
          overtimeHours: processed.overtimeHours,
          source: "biometric" as const,
          approvalStatus: "approved" as const
        });
      }

      // Insert attendance records in batches
      const batchSize = 50;
      for (let i = 0; i < attendanceRecordsToInsert.length; i += batchSize) {
        const batch = attendanceRecordsToInsert.slice(i, i + batchSize);
        await db.insert(attendanceRecords).values(batch);
      }

      console.log(`✅ Successfully updated ${attendanceRecordsToInsert.length} attendance records for ${employeeCode}`);
      
      // Show summary
      const summary = {
        present: attendanceRecordsToInsert.filter(r => r.status === 'present').length,
        late: attendanceRecordsToInsert.filter(r => r.status === 'late').length,
        half_day: attendanceRecordsToInsert.filter(r => r.status === 'half_day').length,
        totalHours: attendanceRecordsToInsert.reduce((sum, r) => sum + (r.totalHours || 0), 0).toFixed(1),
        overtimeHours: attendanceRecordsToInsert.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(1)
      };
      
      console.log(`📈 Summary: ${summary.present} present, ${summary.late} late, ${summary.half_day} half-day`);
      console.log(`⏱️  Total work hours: ${summary.totalHours}, Overtime: ${summary.overtimeHours}`);
    }
    
    console.log("\n🎉 All employee attendance data updated successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating attendance data:", error);
    process.exit(1);
  }
}

updateAttendanceFromRawData();
