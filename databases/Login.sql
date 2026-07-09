create database login;

use login;

create table Login(
	EmpId varchar(6) primary key,
    Username varchar(40),
    Password varchar(20)
);
update login set username = "Krishna Soni", password = 'so2000ni' where empid = 'EMP001';

insert into login values('EMP002','Naresh','naresh@123 '),
('EMP003','suresh','suresh@123'),
('EMP004','gaurav','gaurav@123'),
('EMP005','pragati','pragati@123'),
('EMP006','suneel','suneel@123'),
('EMP007','priya','priya@123'),
('EMP008','preeti','preeti@123'),
('EMP009','deepak','deepak@123'),
('EMP010','chetanya','chetanya@123');
insert into login values("EMP999",'Admin','Yamato@2022');
select * from login;